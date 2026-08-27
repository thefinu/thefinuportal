import express from 'express';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

const router = express.Router();

// Get all transactions
router.get('/', async (req, res) => {
    try {
        const transactions = await Transaction.find().populate('accountId').sort({ date: -1 });
        res.json(transactions);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Create a transaction
router.post('/', async (req, res) => {
    const transaction = new Transaction(req.body);
    try {
        if (!transaction.amount || !isFinite(transaction.amount)) {
            return res.status(400).json({ message: 'amount must be a valid number' });
        }

        const newTransaction = await transaction.save();

        // Update account balance
        const account = await Account.findById(transaction.accountId);
        if (account) {
            if (transaction.type === 'income') {
                account.balance += transaction.amount;
            } else {
                account.balance -= transaction.amount;
            }
            await account.save();
        }

        res.status(201).json(newTransaction);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a transaction
router.delete('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        // Revert account balance
        const account = await Account.findById(transaction.accountId);
        if (account) {
            if (transaction.type === 'income') {
                account.balance -= transaction.amount;
            } else {
                account.balance += transaction.amount;
            }
            await account.save();
        }

        await transaction.deleteOne();
        res.json({ message: 'Transaction deleted' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
