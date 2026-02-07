// Validation middleware using express-validator

const { body, param, query, validationResult } = require('express-validator');

// ==================== VALIDATION ERROR HANDLER ====================

/**
 * Middleware to handle validation errors from express-validator
 * Returns detailed, user-friendly error messages
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Group errors by field for better organization
        const fieldErrors = {};
        const generalErrors = [];

        errors.array().forEach(error => {
            if (error.path && error.path.includes('.')) {
                // Handle nested field errors (e.g., items.*.item_type)
                const pathParts = error.path.split('.');
                const field = pathParts[0];
                const subField = pathParts.slice(1).join('.');

                if (!fieldErrors[field]) {
                    fieldErrors[field] = [];
                }

                // Add item index for array fields
                const itemIndex = error.location === 'body' && req.body[field] && Array.isArray(req.body[field])
                    ? `Item ${parseInt(pathParts[1]) + 1}: `
                    : '';

                fieldErrors[field].push(`${itemIndex}${error.msg}`);
            } else {
                // Handle general field errors
                if (error.path) {
                    if (!fieldErrors[error.path]) {
                        fieldErrors[error.path] = [];
                    }
                    fieldErrors[error.path].push(error.msg);
                } else {
                    generalErrors.push(error.msg);
                }
            }
        });

        // Format response
        const errorResponse = {
            success: false,
            message: 'Validation failed',
            errors: fieldErrors,
            code: 'VALIDATION_ERROR'
        };

        // Add general errors if any
        if (generalErrors.length > 0) {
            errorResponse.general_errors = generalErrors;
        }

        // Add summary for quick reference
        const totalErrors = Object.values(fieldErrors).reduce((sum, arr) => sum + arr.length, 0) + generalErrors.length;
        errorResponse.summary = `${totalErrors} validation error(s) found`;

        return res.status(400).json(errorResponse);
    }

    next();
};

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
    // Basic transaction fields
    body('vehicle_id')
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1 })
        .withMessage('Vehicle ID harus berupa angka positif yang valid'),

    body('mechanic_id')
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1 })
        .withMessage('Mechanic ID harus berupa angka positif yang valid'),

    body('current_km')
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 0, max: 999999 })
        .withMessage('Current KM harus berupa angka antara 0-999999'),

    body('discount_amount')
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 0 })
        .withMessage('Discount amount harus berupa angka positif atau nol'),

    body('notes')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes maksimal 500 karakter'),

    // Items validation - comprehensive
    body('items')
        .exists({ checkFalsy: true })
        .withMessage('Items wajib diisi dan tidak boleh kosong')
        .isArray({ min: 1, max: 50 })
        .withMessage('Transaksi harus memiliki 1-50 item'),

    body('items.*.item_type')
        .exists()
        .withMessage('Setiap item harus memiliki item_type')
        .isIn(['PRODUCT', 'SERVICE', 'PACKAGE', 'EXTERNAL'])
        .withMessage('Item type harus salah satu dari: PRODUCT, SERVICE, PACKAGE, atau EXTERNAL'),

    // Conditional validation based on item_type
    body('items.*.item_id')
        .if(body('items.*.item_type').isIn(['PRODUCT', 'SERVICE', 'PACKAGE']))
        .exists()
        .withMessage('item_id wajib diisi untuk PRODUCT, SERVICE, dan PACKAGE')
        .isInt({ min: 1 })
        .withMessage('Item ID harus berupa angka positif'),

    body('items.*.item_name')
        .if(body('items.*.item_type').equals('EXTERNAL'))
        .exists()
        .withMessage('item_name wajib diisi untuk item EXTERNAL')
        .trim()
        .notEmpty()
        .withMessage('Nama item external tidak boleh kosong')
        .isLength({ min: 2, max: 100 })
        .withMessage('Nama item external harus 2-100 karakter'),

    body('items.*.base_price')
        .if(body('items.*.item_type').equals('EXTERNAL'))
        .exists()
        .withMessage('base_price wajib diisi untuk item EXTERNAL')
        .isFloat({ min: 0.01 })
        .withMessage('Base price untuk external item minimal 0.01'),

    body('items.*.qty')
        .exists()
        .withMessage('Quantity wajib diisi untuk setiap item')
        .isInt({ min: 1, max: 100 })
        .withMessage('Quantity harus antara 1-100'),

    body('items.*.discount_amount')
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 0 })
        .withMessage('Discount amount per item harus berupa angka positif atau nol'),

    body('items.*.custom_price')
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 0.01 })
        .withMessage('Custom price harus berupa angka positif minimal 0.01'),

    body('items.*.cost_price')
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 0 })
        .withMessage('Cost price harus berupa angka positif atau nol'),

    body('items.*.vendor_name')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('Vendor name maksimal 100 karakter'),

    // Initial payment validation
    body('initial_payment')
        .optional({ nullable: true, checkFalsy: true })
        .isObject()
        .withMessage('Initial payment harus berupa object'),

    body('initial_payment.amount')
        .if(body('initial_payment').exists())
        .exists()
        .withMessage('Payment amount wajib diisi jika initial_payment disertakan')
        .isFloat({ min: 0.01 })
        .withMessage('Payment amount minimal 0.01'),

    body('initial_payment.payment_method')
        .if(body('initial_payment').exists())
        .exists()
        .withMessage('Payment method wajib diisi jika initial_payment disertakan')
        .isIn(['CASH', 'TRANSFER', 'DEBIT', 'CREDIT', 'QRIS', 'OTHER'])
        .withMessage('Payment method harus salah satu dari: CASH, TRANSFER, DEBIT, CREDIT, QRIS, OTHER'),

    body('initial_payment.reference_number')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 50 })
        .withMessage('Reference number maksimal 50 karakter'),

    // Business rule validations
    body()
        .custom((value) => {
            // Validate that if item_type is EXTERNAL, base_price is provided
            if (value.items && Array.isArray(value.items)) {
                for (let i = 0; i < value.items.length; i++) {
                    const item = value.items[i];
                    if (item.item_type === 'EXTERNAL' && (!item.base_price || item.base_price <= 0)) {
                        throw new Error(`Item ${i + 1} (EXTERNAL): base_price wajib diisi dan harus > 0`);
                    }
                    if (item.item_type === 'EXTERNAL' && (!item.item_name || item.item_name.trim() === '')) {
                        throw new Error(`Item ${i + 1} (EXTERNAL): item_name wajib diisi`);
                    }
                    if (['PRODUCT', 'SERVICE', 'PACKAGE'].includes(item.item_type) && !item.item_id) {
                        throw new Error(`Item ${i + 1} (${item.item_type}): item_id wajib diisi`);
                    }
                }
            }
            return true;
        }),

    body()
        .custom((value) => {
            // Validate custom_price only for SERVICE items
            if (value.items && Array.isArray(value.items)) {
                for (let i = 0; i < value.items.length; i++) {
                    const item = value.items[i];
                    if (item.custom_price !== undefined && item.item_type !== 'SERVICE') {
                        throw new Error(`Item ${i + 1}: custom_price hanya bisa digunakan untuk SERVICE items`);
                    }
                }
            }
            return true;
        }),
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
    handleValidationErrors,
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