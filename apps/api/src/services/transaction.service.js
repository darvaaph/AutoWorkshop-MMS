// Transaction service for managing transaction-related logic in the AutoWorkshop MMS application.

const { Transaction, TransactionItem, Vehicle, User, Mechanic } = require('../models');
const { calculateCOGS } = require('../utils/hpp-calculator');

class TransactionService {
    async createTransaction(transactionData) {
        // Logic to create a new transaction
        const transaction = await Transaction.create(transactionData);
        return transaction;
    }

    async getTransactionById(transactionId) {
        // Logic to retrieve a transaction by ID
        const transaction = await Transaction.findByPk(transactionId, {
            include: [TransactionItem, Vehicle, User, Mechanic]
        });
        return transaction;
    }

    async updateTransaction(transactionId, updateData) {
        // Logic to update an existing transaction
        const transaction = await Transaction.findByPk(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        await transaction.update(updateData);
        return transaction;
    }

    async deleteTransaction(transactionId) {
        // Logic to delete a transaction
        const transaction = await Transaction.findByPk(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        await transaction.destroy();
        return transaction;
    }

    async calculateTransactionCOGS(transactionId) {
        // Logic to calculate the Cost of Goods Sold (COGS) for a transaction
        const transactionItems = await TransactionItem.findAll({ where: { transactionId } });
        const cogs = calculateCOGS(transactionItems);
        return cogs;
    }
}

module.exports = new TransactionService();