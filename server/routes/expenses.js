import express from 'express';
import Expense from '../models/Expense.js';
import { authMiddleware } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// Get all expenses for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.userId }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create expense
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, amount, type, date } = req.body;
    
    const expense = new Expense({
      userId: req.userId,
      title,
      amount,
      type,
      date: date || new Date()
    });

    await expense.save();
    
    // Log activity
    await logActivity({
      userId: req.userId,
      type: 'expense_created',
      action: `Created expense "${title}" of ₹${amount}`,
      details: { expenseId: expense._id, title, amount, type }
    });
    
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update expense
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, amount, type, date } = req.body;
    
    // Get old expense data first
    const oldExpense = await Expense.findOne({ _id: req.params.id, userId: req.userId });
    
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title, amount, type, date },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Build detailed change description
    const changes = [];
    if (oldExpense.title !== title) changes.push(`title: "${oldExpense.title}" → "${title}"`);
    if (oldExpense.amount !== amount) changes.push(`amount: ₹${oldExpense.amount} → ₹${amount}`);
    if (oldExpense.type !== type) changes.push(`type: ${oldExpense.type} → ${type}`);
    
    const changeText = changes.length > 0 ? ` (${changes.join(', ')})` : '';

    // Log activity
    await logActivity({
      userId: req.userId,
      type: 'expense_updated',
      action: `Updated expense "${title}"${changeText}`,
      details: { 
        expenseId: expense._id, 
        title, 
        amount, 
        type,
        oldTitle: oldExpense.title,
        oldAmount: oldExpense.amount,
        oldType: oldExpense.type
      }
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete expense
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Log activity
    await logActivity({
      userId: req.userId,
      type: 'expense_deleted',
      action: `Deleted expense "${expense.title}" (₹${expense.amount})`,
      details: { title: expense.title, amount: expense.amount, type: expense.type }
    });

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
