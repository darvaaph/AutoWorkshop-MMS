'use strict';

// Pure/IO helpers extracted from the POS transaction controller so that
// createTransaction reads as an orchestration rather than a 400-line god function.
// Validation guards throw AppError; the controller's catch rolls back the open
// Sequelize transaction and the central error middleware shapes the response.

const Product = require('../models/product.model');
const Service = require('../models/service.model');
const Package = require('../models/package.model');
const PackageItem = require('../models/package-item.model');
const Vehicle = require('../models/vehicle.model');
const Mechanic = require('../models/mechanic.model');
const InventoryLog = require('../models/inventory-log.model');
const AppError = require('../utils/app-error');
const { TRANSACTION_STATUS, ITEM_TYPE, INVENTORY_TYPE, INVENTORY_REFERENCE } = require('../utils/constants');

/**
 * Validate the optional vehicle/mechanic references against the live (locked) txn.
 */
async function assertVehicleAndMechanic(vehicleId, mechanicId, t) {
    if (vehicleId) {
        const vehicle = await Vehicle.findByPk(vehicleId, { transaction: t });
        if (!vehicle) {
            throw new AppError(400, 'Vehicle not found');
        }
    }
    if (mechanicId) {
        const mechanic = await Mechanic.findOne({
            where: { id: mechanicId, is_active: true },
            transaction: t
        });
        if (!mechanic) {
            throw new AppError(400, 'Mechanic not found or inactive');
        }
    }
}

/**
 * Bulk-fetch every product/service/package (and package-component product)
 * referenced by the line items, returning O(1) lookup maps. Products are
 * row-locked for the duration of the transaction.
 */
async function fetchItemCatalog(items, t) {
    const productIds = new Set();
    const serviceIds = new Set();
    const packageIds = new Set();

    for (const item of items) {
        if (item.item_type === ITEM_TYPE.PRODUCT && item.item_id) {
            productIds.add(item.item_id);
        } else if (item.item_type === ITEM_TYPE.SERVICE && item.item_id) {
            serviceIds.add(item.item_id);
        } else if (item.item_type === ITEM_TYPE.PACKAGE && item.item_id) {
            packageIds.add(item.item_id);
        }
    }

    const [products, services, packages] = await Promise.all([
        productIds.size > 0 ? Product.findAll({
            where: { id: Array.from(productIds) },
            transaction: t,
            lock: t.LOCK.UPDATE
        }) : [],
        serviceIds.size > 0 ? Service.findAll({
            where: { id: Array.from(serviceIds) },
            transaction: t
        }) : [],
        packageIds.size > 0 ? Package.findAll({
            where: {
                id: Array.from(packageIds),
                is_active: true
            },
            include: [{
                model: PackageItem,
                as: 'items',
                include: [
                    { model: Product, as: 'product' },
                    { model: Service, as: 'service' }
                ]
            }],
            transaction: t
        }) : []
    ]);

    const productMap = products.reduce((map, p) => { map[p.id] = p; return map; }, {});
    const serviceMap = services.reduce((map, s) => { map[s.id] = s; return map; }, {});
    const packageMap = packages.reduce((map, pkg) => { map[pkg.id] = pkg; return map; }, {});

    // Package component products may not be in the top-level product set.
    const packageProductIds = new Set();
    for (const pkg of packages) {
        for (const pkgItem of pkg.items) {
            if (pkgItem.product_id) {
                packageProductIds.add(pkgItem.product_id);
            }
        }
    }

    const packageProducts = packageProductIds.size > 0 ?
        await Product.findAll({
            where: { id: Array.from(packageProductIds) },
            transaction: t,
            lock: t.LOCK.UPDATE
        }) : [];

    const packageProductMap = packageProducts.reduce((map, p) => { map[p.id] = p; return map; }, {});

    return { productMap, serviceMap, packageMap, packageProductMap };
}

/**
 * Validate + price each line item against the catalog maps. Pure (no DB):
 * returns the rows to persist, the product components to deduct, and the subtotal.
 * Prices come from the database (frontend prices are ignored) except SERVICE
 * custom_price and EXTERNAL items.
 */
function priceItems(items, maps) {
    const { productMap, serviceMap, packageMap, packageProductMap } = maps;
    const processedItems = [];
    const allComponentsToDeduct = [];
    let subtotal = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (!item.item_type) {
            throw new AppError(400, `Item ${i + 1}: item_type is required`);
        }

        if (item.item_type !== ITEM_TYPE.EXTERNAL && !item.item_id) {
            throw new AppError(400, `Item ${i + 1}: item_id is required for type ${item.item_type}`);
        }

        const qty = item.qty || 1;
        let basePrice = 0;
        let sellPrice = 0;
        let costPrice = 0;
        let itemName = '';

        if (item.item_type === ITEM_TYPE.PRODUCT) {
            const product = productMap[item.item_id];
            if (!product) {
                throw new AppError(400, `Product with ID ${item.item_id} not found`);
            }
            if (product.stock < qty) {
                throw new AppError(400, `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`);
            }
            basePrice = parseFloat(product.price_sell); // Use database price, ignore frontend
            sellPrice = basePrice - parseFloat(item.discount_amount || 0);
            costPrice = parseFloat(product.price_buy);
            itemName = product.name;
            allComponentsToDeduct.push({
                product_id: product.id,
                product_name: product.name,
                qty: qty,
                current_stock: product.stock
            });
        } else if (item.item_type === ITEM_TYPE.SERVICE) {
            const service = serviceMap[item.item_id];
            if (!service) {
                throw new AppError(400, `Service with ID ${item.item_id} not found`);
            }
            basePrice = item.custom_price ? parseFloat(item.custom_price) : parseFloat(service.price); // Use custom_price if provided
            sellPrice = basePrice - parseFloat(item.discount_amount || 0);
            costPrice = 0; // Services have no COGS
            itemName = service.name;
        } else if (item.item_type === ITEM_TYPE.PACKAGE) {
            const pkg = packageMap[item.item_id];
            if (!pkg) {
                throw new AppError(400, `Package with ID ${item.item_id} not found or inactive`);
            }
            basePrice = parseFloat(pkg.price); // Use database price, ignore frontend
            sellPrice = basePrice - parseFloat(item.discount_amount || 0);
            itemName = pkg.name;
            let totalComponentCost = 0;
            for (const pkgItem of pkg.items) {
                if (pkgItem.product_id) {
                    // Use cached package product data
                    const product = packageProductMap[pkgItem.product_id] || pkgItem.product;
                    if (!product || product.stock < (pkgItem.qty * qty)) {
                        throw new AppError(400, `Insufficient stock for package component "${product?.name || 'Unknown'}". Available: ${product?.stock || 0}, Required: ${pkgItem.qty * qty}`);
                    }
                    totalComponentCost += parseFloat(product.price_buy) * pkgItem.qty;
                    allComponentsToDeduct.push({
                        product_id: product.id,
                        product_name: product.name,
                        qty: pkgItem.qty * qty,
                        current_stock: product.stock,
                        is_package_component: true,
                        package_name: pkg.name
                    });
                }
            }
            costPrice = totalComponentCost * qty;
        } else if (item.item_type === ITEM_TYPE.EXTERNAL) {
            basePrice = parseFloat(item.base_price || 0);
            sellPrice = basePrice - parseFloat(item.discount_amount || 0);
            costPrice = parseFloat(item.cost_price || 0);
            itemName = item.item_name;
        } else {
            throw new AppError(400, `Invalid item type: ${item.item_type}`);
        }

        processedItems.push({
            item_type: item.item_type,
            item_id: item.item_id || 0,
            item_name: itemName,
            qty: qty,
            base_price: basePrice,
            discount_amount: parseFloat(item.discount_amount || 0),
            sell_price: sellPrice,
            cost_price: costPrice
        });

        subtotal += sellPrice * qty;
    }

    return { processedItems, allComponentsToDeduct, subtotal };
}

/**
 * Apply stock deductions + write inventory OUT logs for a created transaction.
 * Components are grouped by product so each product gets one stock update.
 */
async function deductInventory(allComponentsToDeduct, { userId, transactionId, t }) {
    if (allComponentsToDeduct.length === 0) return;

    const productUpdates = new Map();
    for (const component of allComponentsToDeduct) {
        if (!productUpdates.has(component.product_id)) {
            productUpdates.set(component.product_id, {
                product_id: component.product_id,
                product_name: component.product_name,
                total_qty: 0,
                current_stock: component.current_stock,
                components: []
            });
        }
        const update = productUpdates.get(component.product_id);
        update.total_qty += component.qty;
        update.components.push(component);
    }

    for (const [productId, update] of productUpdates) {
        const stockBefore = update.current_stock;
        const stockAfter = stockBefore - update.total_qty;

        await Product.update(
            { stock: stockAfter },
            { where: { id: productId }, transaction: t }
        );

        for (const component of update.components) {
            await InventoryLog.create({
                product_id: component.product_id,
                user_id: userId,
                type: INVENTORY_TYPE.OUT,
                qty: component.qty,
                stock_before: stockBefore,
                stock_after: stockAfter,
                reference_type: INVENTORY_REFERENCE.TRANSACTION,
                reference_id: `TRX-${transactionId}`,
                notes: component.is_package_component
                    ? `Out via Package "${component.package_name}" - Transaction #${transactionId}`
                    : `Sale - Transaction #${transactionId}`
            }, { transaction: t });
        }
    }
}

// ============================================================================
// updateTransaction ("bon sementara" edit) helpers
// ============================================================================

/**
 * Split the incoming edit payload into kept (has id) vs new items and validate
 * structure, qty, and PACKAGE immutability (package lines can't change qty or
 * be dropped via edit). Returns enriched kept/new descriptors + the kept id set.
 */
function parseEditItems(items, existingItems) {
    const existingById = new Map(existingItems.map(it => [it.id, it]));

    const keptInputs = [];
    const newInputs = [];
    for (let i = 0; i < items.length; i++) {
        const raw = items[i];
        if (raw === null || typeof raw !== 'object') {
            throw new AppError(400, `Item ke-${i + 1} tidak valid`);
        }
        if (raw.id !== undefined && raw.id !== null && raw.id !== '') {
            const parsedId = parseInt(raw.id, 10);
            if (!Number.isInteger(parsedId) || parsedId < 1) {
                throw new AppError(400, `Item ke-${i + 1}: id tidak valid`);
            }
            keptInputs.push({ index: i, id: parsedId, qty: raw.qty });
        } else {
            newInputs.push({ index: i, raw });
        }
    }

    const keptIds = new Set();
    for (const k of keptInputs) {
        const existing = existingById.get(k.id);
        if (!existing) {
            throw new AppError(400, `Item dengan id ${k.id} bukan milik transaksi ini`);
        }
        if (keptIds.has(k.id)) {
            throw new AppError(400, `Item dengan id ${k.id} terkirim ganda`);
        }
        keptIds.add(k.id);

        const qty = parseInt(k.qty, 10);
        if (!Number.isInteger(qty) || qty < 1) {
            throw new AppError(400, `Qty item "${existing.item_name}" harus bilangan bulat minimal 1`);
        }
        k.qtyParsed = qty;
        k.existing = existing;

        // PACKAGE is immutable: qty must stay the same
        if (existing.item_type === ITEM_TYPE.PACKAGE && qty !== existing.qty) {
            throw new AppError(400, `Qty paket "${existing.item_name}" tidak dapat diubah lewat edit. Batalkan transaksi bila perlu mengubah paket.`);
        }
    }

    // Every existing package must be kept (cannot be removed via edit)
    for (const it of existingItems) {
        if (it.item_type === ITEM_TYPE.PACKAGE && !keptIds.has(it.id)) {
            throw new AppError(400, `Paket "${it.item_name}" tidak dapat dihapus lewat edit. Batalkan transaksi bila perlu.`);
        }
    }

    const processedNew = [];
    for (const n of newInputs) {
        const raw = n.raw;
        const pos = n.index + 1;

        if (!raw.item_type) {
            throw new AppError(400, `Item ke-${pos}: item_type wajib diisi`);
        }
        if (raw.item_type === ITEM_TYPE.PACKAGE) {
            throw new AppError(400, 'Menambah paket lewat edit belum didukung. Tambahkan produk/jasa satuan.');
        }
        if (![ITEM_TYPE.PRODUCT, ITEM_TYPE.SERVICE, ITEM_TYPE.EXTERNAL].includes(raw.item_type)) {
            throw new AppError(400, `Item ke-${pos}: item_type tidak valid (${raw.item_type})`);
        }

        const qty = parseInt(raw.qty ?? 1, 10);
        if (!Number.isInteger(qty) || qty < 1) {
            throw new AppError(400, `Item ke-${pos}: qty harus bilangan bulat minimal 1`);
        }
        const discount = parseFloat(raw.discount_amount || 0);
        if (isNaN(discount) || discount < 0) {
            throw new AppError(400, `Item ke-${pos}: diskon tidak valid`);
        }

        processedNew.push({ pos, raw, qty, discount });
    }

    return { keptInputs, processedNew, keptIds };
}

/**
 * Validate per-type id/name presence for the new items, then bulk-fetch + lock
 * the products (existing standalone products + new product items) and services.
 */
async function fetchEditCatalog(existingItems, processedNew, t) {
    const newProductIds = new Set();
    const newServiceIds = new Set();
    for (const p of processedNew) {
        if (p.raw.item_type === ITEM_TYPE.PRODUCT) {
            if (!p.raw.item_id) {
                throw new AppError(400, `Item ke-${p.pos}: item_id wajib untuk PRODUCT`);
            }
            newProductIds.add(p.raw.item_id);
        } else if (p.raw.item_type === ITEM_TYPE.SERVICE) {
            if (!p.raw.item_id) {
                throw new AppError(400, `Item ke-${p.pos}: item_id wajib untuk SERVICE`);
            }
            newServiceIds.add(p.raw.item_id);
        } else if (p.raw.item_type === ITEM_TYPE.EXTERNAL) {
            if (!p.raw.item_name || String(p.raw.item_name).trim() === '') {
                throw new AppError(400, `Item ke-${p.pos}: item_name wajib untuk EXTERNAL`);
            }
        }
    }

    const existingProductIds = new Set(
        existingItems.filter(it => it.item_type === ITEM_TYPE.PRODUCT && it.item_id).map(it => it.item_id)
    );
    const allProductIds = new Set([...existingProductIds, ...newProductIds]);

    const [productRows, serviceRows] = await Promise.all([
        allProductIds.size > 0
            ? Product.findAll({ where: { id: Array.from(allProductIds) }, transaction: t, lock: t.LOCK.UPDATE })
            : [],
        newServiceIds.size > 0
            ? Service.findAll({ where: { id: Array.from(newServiceIds) }, transaction: t })
            : [],
    ]);
    const productMap = productRows.reduce((m, p) => { m[p.id] = p; return m; }, {});
    const serviceMap = serviceRows.reduce((m, s) => { m[s.id] = s; return m; }, {});
    return { productMap, serviceMap };
}

/**
 * Build the rows to persist + subtotal. Kept rows keep their stored sell_price
 * (only qty may change); new rows are priced from master data (PRODUCT/SERVICE)
 * or the payload (EXTERNAL).
 */
function buildEditedRows(keptInputs, processedNew, productMap, serviceMap, transactionId) {
    const newRowsToCreate = [];
    let subtotal = 0;

    for (const k of keptInputs) {
        subtotal += parseFloat(k.existing.sell_price) * k.qtyParsed;
    }

    for (const p of processedNew) {
        const { raw, qty, discount } = p;
        let basePrice = 0, sellPrice = 0, costPrice = 0, itemName = '';

        if (raw.item_type === ITEM_TYPE.PRODUCT) {
            const product = productMap[raw.item_id];
            if (!product) {
                throw new AppError(400, `Produk dengan id ${raw.item_id} tidak ditemukan`);
            }
            basePrice = parseFloat(product.price_sell);
            sellPrice = basePrice - discount;
            costPrice = parseFloat(product.price_buy);
            itemName = product.name;
        } else if (raw.item_type === ITEM_TYPE.SERVICE) {
            const service = serviceMap[raw.item_id];
            if (!service) {
                throw new AppError(400, `Jasa dengan id ${raw.item_id} tidak ditemukan`);
            }
            basePrice = raw.custom_price ? parseFloat(raw.custom_price) : parseFloat(service.price);
            sellPrice = basePrice - discount;
            costPrice = 0;
            itemName = service.name;
        } else { // EXTERNAL
            basePrice = parseFloat(raw.base_price || 0);
            sellPrice = basePrice - discount;
            costPrice = parseFloat(raw.cost_price || 0);
            itemName = String(raw.item_name).trim();
        }

        if (sellPrice < 0) {
            throw new AppError(400, `Item ke-${p.pos}: diskon melebihi harga`);
        }

        subtotal += sellPrice * qty;
        newRowsToCreate.push({
            transaction_id: transactionId,
            item_type: raw.item_type,
            item_id: raw.item_id || 0,
            item_name: itemName,
            qty,
            base_price: basePrice,
            discount_amount: discount,
            sell_price: sellPrice,
            cost_price: costPrice,
        });
    }

    return { newRowsToCreate, subtotal };
}

/**
 * Compute the net per-product stock change (newQty - oldQty across PRODUCT lines)
 * and validate availability for increases BEFORE any write. Returns the changes
 * to apply.
 */
function computeEditStockDeltas(existingItems, keptInputs, processedNew, productMap) {
    const oldQtyByProduct = new Map();
    for (const it of existingItems) {
        if (it.item_type === ITEM_TYPE.PRODUCT && it.item_id) {
            oldQtyByProduct.set(it.item_id, (oldQtyByProduct.get(it.item_id) || 0) + it.qty);
        }
    }
    const newQtyByProduct = new Map();
    for (const k of keptInputs) {
        if (k.existing.item_type === ITEM_TYPE.PRODUCT && k.existing.item_id) {
            newQtyByProduct.set(k.existing.item_id, (newQtyByProduct.get(k.existing.item_id) || 0) + k.qtyParsed);
        }
    }
    for (const p of processedNew) {
        if (p.raw.item_type === ITEM_TYPE.PRODUCT) {
            newQtyByProduct.set(p.raw.item_id, (newQtyByProduct.get(p.raw.item_id) || 0) + p.qty);
        }
    }

    const stockChanges = [];
    const productIdsUnion = new Set([...oldQtyByProduct.keys(), ...newQtyByProduct.keys()]);
    for (const pid of productIdsUnion) {
        const net = (newQtyByProduct.get(pid) || 0) - (oldQtyByProduct.get(pid) || 0);
        if (net === 0) continue;
        const product = productMap[pid];
        if (!product) {
            throw new AppError(400, `Produk id ${pid} tidak ditemukan untuk penyesuaian stok`);
        }
        if (net > 0 && product.stock < net) {
            throw new AppError(400, `Stok "${product.name}" tidak cukup. Tersedia: ${product.stock}, tambahan dibutuhkan: ${net}`);
        }
        stockChanges.push({ product, net });
    }
    return stockChanges;
}

/**
 * Apply the computed stock deltas + write one inventory log per product
 * (OUT for net increase, IN/RETURN for net decrease).
 */
async function applyEditStockDeltas(stockChanges, { userId, transactionId, t }) {
    for (const { product, net } of stockChanges) {
        const stockBefore = product.stock;
        const stockAfter = stockBefore - net; // net>0 deducts, net<0 returns
        await Product.update({ stock: stockAfter }, { where: { id: product.id }, transaction: t });
        await InventoryLog.create({
            product_id: product.id,
            user_id: userId,
            type: net > 0 ? INVENTORY_TYPE.OUT : INVENTORY_TYPE.IN,
            qty: Math.abs(net),
            stock_before: stockBefore,
            stock_after: stockAfter,
            reference_type: net > 0 ? INVENTORY_REFERENCE.TRANSACTION : INVENTORY_REFERENCE.RETURN,
            reference_id: `TRX-${transactionId}`,
            notes: net > 0
                ? `Edit transaksi #${transactionId} - tambah qty`
                : `Edit transaksi #${transactionId} - kurangi/hapus item`
        }, { transaction: t });
    }
}

/**
 * Recompute the bill status against existing payments (an edit never adds a
 * payment): PENDING stays PENDING when unpaid, otherwise UNPAID/PARTIAL/PAID.
 */
function deriveEditedStatus(totalPaid, totalAmount, beforeStatus) {
    if (totalPaid <= 0) {
        return beforeStatus === TRANSACTION_STATUS.PENDING ? TRANSACTION_STATUS.PENDING : TRANSACTION_STATUS.UNPAID;
    }
    if (totalPaid >= totalAmount) {
        return TRANSACTION_STATUS.PAID;
    }
    return TRANSACTION_STATUS.PARTIAL;
}

module.exports = {
    assertVehicleAndMechanic,
    fetchItemCatalog,
    priceItems,
    deductInventory,
    parseEditItems,
    fetchEditCatalog,
    buildEditedRows,
    computeEditStockDeltas,
    applyEditStockDeltas,
    deriveEditedStatus,
};
