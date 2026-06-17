// payments.controller.js

const Payment = require('../models/payment.model');
const Transaction = require('../models/transaction.model');
const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/async-handler');
const { TRANSACTION_STATUS } = require('../utils/constants');

// Create a new payment
exports.createPayment = asyncHandler(async (req, res) => {
    const { transactionId, amount, paymentMethod, referenceNumber, notes } = req.body;

    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
    }

    const payment = await Payment.create({
        transaction_id: transactionId,
        user_id: req.user.id,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: notes || null,
        date: new Date(),
    });

    // Update transaction status based on total payments
    const allPayments = await Payment.findAll({
        where: { transaction_id: transactionId }
    });
    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = parseFloat(transaction.total_amount);

    let newStatus;
    if (totalPaid >= totalAmount) {
        newStatus = TRANSACTION_STATUS.PAID;
    } else if (totalPaid > 0) {
        newStatus = TRANSACTION_STATUS.PARTIAL;
    } else {
        newStatus = TRANSACTION_STATUS.UNPAID;
    }

    const oldStatus = transaction.status;
    await transaction.update({ status: newStatus });

    // Audit log for payment creation
    await auditService.logCreate(req.user.id, 'payments', payment.id, {
        transaction_id: transactionId,
        amount,
        payment_method: paymentMethod,
        old_transaction_status: oldStatus,
        new_transaction_status: newStatus
    }, req);

    return res.status(201).json({
        success: true,
        message: 'Payment added successfully',
        data: {
            payment,
            transaction_status: newStatus,
            payment_summary: {
                total_amount: totalAmount,
                total_paid: totalPaid,
                remaining: totalAmount - totalPaid
            }
        }
    });
});

// Get all payments
exports.getPayments = asyncHandler(async (req, res) => {
    const payments = await Payment.findAll();
    return res.status(200).json({ success: true, data: payments });
});

// Get payment by ID
exports.getPaymentById = asyncHandler(async (req, res) => {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
    }
    return res.status(200).json({ success: true, data: payment });
});

// Update a payment
exports.updatePayment = asyncHandler(async (req, res) => {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
    }

    const { amount, paymentMethod } = req.body;
    payment.amount = amount;
    payment.payment_method = paymentMethod;
    await payment.save();

    const transaction = await Transaction.findByPk(payment.transaction_id);
    if (transaction) {
        const allPayments = await Payment.findAll({ where: { transaction_id: payment.transaction_id } });
        const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalAmount = parseFloat(transaction.total_amount);
        let newStatus;
        if (totalPaid >= totalAmount) newStatus = TRANSACTION_STATUS.PAID;
        else if (totalPaid > 0) newStatus = TRANSACTION_STATUS.PARTIAL;
        else newStatus = transaction.status === TRANSACTION_STATUS.PENDING ? TRANSACTION_STATUS.PENDING : TRANSACTION_STATUS.UNPAID;
        await transaction.update({ status: newStatus });
    }

    return res.status(200).json({ success: true, data: payment });
});

// Delete a payment
exports.deletePayment = asyncHandler(async (req, res) => {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
    }

    const transactionId = payment.transaction_id;
    await payment.destroy();

    const transaction = await Transaction.findByPk(transactionId);
    if (transaction) {
        const allPayments = await Payment.findAll({ where: { transaction_id: transactionId } });
        const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalAmount = parseFloat(transaction.total_amount);
        let newStatus;
        if (totalPaid >= totalAmount) newStatus = TRANSACTION_STATUS.PAID;
        else if (totalPaid > 0) newStatus = TRANSACTION_STATUS.PARTIAL;
        else newStatus = transaction.status === TRANSACTION_STATUS.PENDING ? TRANSACTION_STATUS.PENDING : TRANSACTION_STATUS.UNPAID;
        await transaction.update({ status: newStatus });
    }

    return res.status(204).send();
});
