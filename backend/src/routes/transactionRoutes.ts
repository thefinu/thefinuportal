import express from 'express';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { auth } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes here are admin-only. They previously had no authentication.

// Get all transactions
router.get('/', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find().populate('accountId').sort({ date: -1 });
        res.json(transactions);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Fields an admin may set when creating a transaction by hand. Passing req.body
// straight into the model let every key in the request reach the document — including
// ones the schema gains later, which nobody reviews again once the route works.
const TRANSACTION_FIELDS = ['accountId', 'date', 'description', 'amount', 'type', 'category', 'notes'];

// Create a transaction
router.post('/', auth, async (req, res) => {
    const payload: Record<string, unknown> = {};
    for (const field of TRANSACTION_FIELDS) {
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, field)) {
            payload[field] = req.body[field];
        }
    }

    const transaction = new Transaction(payload);
    try {
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
router.delete('/:id', auth, async (req, res) => {
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
