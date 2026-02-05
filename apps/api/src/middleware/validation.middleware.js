// Validation middleware using express-validator

const { body, param, query } = require('express-validator');

// ==================== AUTH VALIDATORS ====================

const validateLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username wajib diisi'),
    body('password')
        .notEmpty()
        .withMessage('Password wajib diisi'),
];

const validateRegister = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username wajib diisi')
        .isLength({ min: 3 })
        .withMessage('Username minimal 3 karakter')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username hanya boleh huruf, angka, dan underscore'),
    body('password')
        .notEmpty()
        .withMessage('Password wajib diisi')
        .isLength({ min: 6 })
        .withMessage('Password minimal 6 karakter'),
    body('full_name')
        .trim()
        .notEmpty()
        .withMessage('Nama lengkap wajib diisi'),
    body('role')
        .isIn(['ADMIN', 'CASHIER'])
        .withMessage('Role harus ADMIN atau CASHIER'),
];

const validateChangePassword = [
    body('old_password')
        .notEmpty()
        .withMessage('Password lama wajib diisi'),
    body('new_password')
        .notEmpty()
        .withMessage('Password baru wajib diisi')
        .isLength({ min: 6 })
        .withMessage('Password baru minimal 6 karakter'),
    body('confirm_password')
        .notEmpty()
        .withMessage('Konfirmasi password wajib diisi')
        .custom((value, { req }) => {
            if (value !== req.body.new_password) {
                throw new Error('Konfirmasi password tidak cocok');
            }
            return true;
        }),
];

// ==================== CUSTOMER VALIDATORS ====================

const validateCustomer = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Nama customer wajib diisi'),
    body('phone')
        .optional()
        .trim()
        .matches(/^[0-9+\-\s]+$/)
        .withMessage('Format nomor telepon tidak valid'),
    body('address')
        .optional()
        .trim(),
];

// ==================== VEHICLE VALIDATORS ====================

const validateVehicle = [
    body('plate_number')
        .trim()
        .notEmpty()
        .withMessage('Nomor plat wajib diisi')
        .toUpperCase(),
    body('customer_id')
        .notEmpty()
        .withMessage('Customer ID wajib diisi')
        .isInt()
        .withMessage('Customer ID harus berupa angka'),
    body('brand')
        .optional()
        .trim(),
    body('model')
        .optional()
        .trim(),
    body('year')
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
        .withMessage('Tahun tidak valid'),
    body('color')
        .optional()
        .trim(),
    body('transmission')
        .optional()
        .isIn(['MT', 'AT', 'CVT'])
        .withMessage('Transmisi harus MT, AT, atau CVT'),
];

// ==================== PRODUCT VALIDATORS ====================

const validateProduct = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Nama produk wajib diisi'),
    body('sku')
        .optional()
        .trim()
        .toUpperCase(),
    body('category')
        .optional()
        .trim(),
    body('unit')
        .optional()
        .trim()
        .default('pcs'),
    body('sell_price')
        .notEmpty()
        .withMessage('Harga jual wajib diisi')
        .isFloat({ min: 0 })
        .withMessage('Harga jual harus berupa angka positif'),
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stok harus berupa angka positif'),
    body('min_stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stok minimum harus berupa angka positif'),
];

// ==================== SERVICE VALIDATORS ====================

const validateService = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Nama jasa wajib diisi'),
    body('category')
        .optional()
        .trim(),
    body('price')
        .notEmpty()
        .withMessage('Harga jasa wajib diisi')
        .isFloat({ min: 0 })
        .withMessage('Harga jasa harus berupa angka positif'),
    body('estimated_duration')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Estimasi durasi harus berupa angka positif (menit)'),
];

// ==================== PACKAGE VALIDATORS ====================

const validatePackage = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Nama paket wajib diisi'),
    body('price')
        .notEmpty()
        .withMessage('Harga paket wajib diisi')
        .isFloat({ min: 0 })
        .withMessage('Harga paket harus berupa angka positif'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('Paket harus memiliki minimal 1 item'),
    body('items.*.type')
        .isIn(['PRODUCT', 'SERVICE'])
        .withMessage('Tipe item harus PRODUCT atau SERVICE'),
    body('items.*.reference_id')
        .isInt()
        .withMessage('Reference ID harus berupa angka'),
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity harus minimal 1'),
];

// ==================== MECHANIC VALIDATORS ====================

const validateMechanic = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Nama mekanik wajib diisi'),
    body('phone')
        .optional()
        .trim()
        .matches(/^[0-9+\-\s]+$/)
        .withMessage('Format nomor telepon tidak valid'),
    body('specialization')
        .optional()
        .trim(),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('Status aktif harus boolean'),
];

// ==================== TRANSACTION VALIDATORS ====================

const validateTransaction = [
    body('vehicle_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Vehicle ID harus berupa angka positif'),
    body('mechanic_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Mechanic ID harus berupa angka positif'),
    body('current_km')
        .optional()
        .isInt({ min: 0 })
        .withMessage('KM harus berupa angka positif'),
    body('discount_amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Diskon harus berupa angka positif'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('Transaksi harus memiliki minimal 1 item'),
    body('items.*.item_type')
        .isIn(['PRODUCT', 'SERVICE', 'PACKAGE', 'EXTERNAL'])
        .withMessage('Tipe item harus PRODUCT, SERVICE, PACKAGE, atau EXTERNAL'),
    body('items.*.item_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Item ID harus berupa angka positif'),
    body('items.*.qty')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Quantity harus minimal 1'),
    body('items.*.discount_amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Diskon item harus berupa angka positif'),
    body('items.*.item_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Nama item external wajib diisi'),
    body('items.*.base_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Harga harus berupa angka positif'),
    body('items.*.vendor_name')
        .optional()
        .trim(),
    body('initial_payment.amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Jumlah pembayaran harus berupa angka positif'),
    body('initial_payment.payment_method')
        .optional()
        .isIn(['CASH', 'TRANSFER', 'DEBIT', 'CREDIT', 'QRIS', 'OTHER'])
        .withMessage('Metode pembayaran tidak valid'),
    body('notes')
        .optional()
        .trim(),
];

// ==================== PAYMENT VALIDATORS ====================

const validatePayment = [
    body('amount')
        .notEmpty()
        .withMessage('Jumlah pembayaran wajib diisi')
        .isFloat({ min: 0.01 })
        .withMessage('Jumlah pembayaran harus lebih dari 0'),
    body('payment_method')
        .notEmpty()
        .withMessage('Metode pembayaran wajib diisi')
        .isIn(['CASH', 'TRANSFER', 'DEBIT', 'CREDIT', 'QRIS', 'OTHER'])
        .withMessage('Metode pembayaran tidak valid'),
    body('reference_number')
        .optional()
        .trim(),
];

// ==================== EXPENSE VALIDATORS ====================

const validateExpense = [
    body('category')
        .trim()
        .notEmpty()
        .withMessage('Kategori wajib diisi'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Deskripsi wajib diisi'),
    body('amount')
        .notEmpty()
        .withMessage('Jumlah wajib diisi')
        .isFloat({ min: 0 })
        .withMessage('Jumlah harus berupa angka positif'),
    body('expense_date')
        .optional()
        .isISO8601()
        .withMessage('Format tanggal tidak valid'),
];

// ==================== INVENTORY VALIDATORS ====================

const validateInventory = [
    body('product_id')
        .notEmpty()
        .withMessage('Product ID wajib diisi')
        .isInt()
        .withMessage('Product ID harus berupa angka'),
    body('type')
        .notEmpty()
        .withMessage('Tipe wajib diisi')
        .isIn(['IN', 'OUT', 'ADJUSTMENT'])
        .withMessage('Tipe harus IN, OUT, atau ADJUSTMENT'),
    body('quantity')
        .notEmpty()
        .withMessage('Quantity wajib diisi')
        .isInt({ min: 1 })
        .withMessage('Quantity harus minimal 1'),
    body('unit_cost')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Unit cost harus berupa angka positif'),
    body('notes')
        .optional()
        .trim(),
];

// ==================== SETTING VALIDATORS ====================

const validateSetting = [
    body('key')
        .trim()
        .notEmpty()
        .withMessage('Key wajib diisi'),
    body('value')
        .notEmpty()
        .withMessage('Value wajib diisi'),
];

module.exports = {
    validateLogin,
    validateRegister,
    validateChangePassword,
    validateCustomer,
    validateVehicle,
    validateProduct,
    validateService,
    validatePackage,
    validateMechanic,
    validateTransaction,
    validatePayment,
    validateExpense,
    validateInventory,
    validateSetting,
};