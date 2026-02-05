// payments.controller.js

const Payment = require('../models/payment.model');
const Transaction = require('../models/transaction.model');
const auditService = require('../services/audit.service');

// Create a new payment
exports.createPayment = async (req, res) => {
    try {
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
            newStatus = 'PAID';
        } else if (totalPaid > 0) {
            newStatus = 'PARTIAL';
        } else {
            newStatus = 'UNPAID';
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
    } catch (error) {
        console.error('Payment create error:', error);
        return res.status(500).json({ message: 'Error creating payment', error: error.message });
    }
};

// Get all payments
exports.getPayments = async (req, res) => {
    try {
        const payments = await Payment.findAll();
        return res.status(200).json(payments);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching payments', error });
    }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        return res.status(200).json(payment);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching payment', error });
    }
};

// Update a payment
exports.updatePayment = async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        const { amount, paymentMethod } = req.body;
        payment.amount = amount;
        payment.payment_method = paymentMethod;

        await payment.save();
        return res.status(200).json(payment);
    } catch (error) {
        return res.status(500).json({ message: 'Error updating payment', error });
    }
};

// Delete a payment
exports.deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        await payment.destroy();
        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ message: 'Error deleting payment', error });
    }
};