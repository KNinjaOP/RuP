import express from 'express';
import GroupExpense from '../models/GroupExpense.js';
import Group from '../models/Group.js';
import Settlement from '../models/Settlement.js';
import { authMiddleware } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// Get all expenses for a group
router.get('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const expenses = await GroupExpense.find({ groupId: req.params.groupId }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create group expense
router.post('/:groupId', authMiddleware, async (req, res) => {
  try {
    const { title, amount, type, date, paidBy, splitAmong } = req.body;
    
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Calculate split amounts
    const splitAmount = amount / splitAmong.length;
    const splitWithAmounts = splitAmong.map(member => ({
      ...member,
      amount: splitAmount
    }));

    const expense = new GroupExpense({
      groupId: req.params.groupId,
      title,
      amount,
      type,
      date: date || new Date(),
      paidBy,
      splitAmong: splitWithAmounts
    });

    await expense.save();
    
    // Log activity
    await logActivity({
      userId: req.userId,
      groupId: req.params.groupId,
      type: 'expense_created',
      action: `Added expense "${title}" (₹${amount}) paid by ${paidBy.username}, split ${splitAmong.length} ways`,
      details: { expenseId: expense._id, title, amount, type, paidBy: paidBy.username, splitCount: splitAmong.length }
    });
    
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update group expense
router.put('/:groupId/:id', authMiddleware, async (req, res) => {
  try {
    const { title, amount, type, date, paidBy, splitAmong } = req.body;
    
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Get old expense first
    const oldExpense = await GroupExpense.findOne({ _id: req.params.id, groupId: req.params.groupId });

    // Calculate split amounts
    const splitAmount = amount / splitAmong.length;
    const splitWithAmounts = splitAmong.map(member => ({
      ...member,
      amount: splitAmount
    }));

    const expense = await GroupExpense.findOneAndUpdate(
      { _id: req.params.id, groupId: req.params.groupId },
      { title, amount, type, date, paidBy, splitAmong: splitWithAmounts },
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
    if (oldExpense.paidBy.username !== paidBy.username) changes.push(`paid by: ${oldExpense.paidBy.username} → ${paidBy.username}`);
    
    const changeText = changes.length > 0 ? ` (${changes.join(', ')})` : '';

    // Log activity
    await logActivity({
      userId: req.userId,
      groupId: req.params.groupId,
      type: 'expense_updated',
      action: `Updated expense "${title}" in ${group.name}${changeText}`,
      details: { 
        expenseId: expense._id, 
        title, 
        amount, 
        type,
        oldTitle: oldExpense.title,
        oldAmount: oldExpense.amount
      }
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete group expense
router.delete('/:groupId/:id', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const expense = await GroupExpense.findOneAndDelete({
      _id: req.params.id,
      groupId: req.params.groupId
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Log activity
    await logActivity({
      userId: req.userId,
      groupId: req.params.groupId,
      type: 'expense_deleted',
      action: `Deleted expense "${expense.title}" (₹${expense.amount}) from ${group.name}`,
      details: { title: expense.title, amount: expense.amount, type: expense.type, groupName: group.name }
    });

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get balance summary for group
router.get('/:groupId/balance', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const expenses = await GroupExpense.find({ groupId: req.params.groupId });
    const settlements = await Settlement.find({ groupId: req.params.groupId });

    // Calculate balances
    const balances = {};
    
    // Initialize balances for all members
    group.members.forEach(member => {
      balances[member.userId.toString()] = {
        userId: member.userId,
        username: member.username,
        balance: 0
      };
    });

    // Add expenses
    expenses.forEach(expense => {
      const paidById = expense.paidBy.userId.toString();
      
      // Person who paid gets credited
      if (balances[paidById]) {
        balances[paidById].balance += expense.amount;
      }

      // Everyone who split gets debited
      expense.splitAmong.forEach(split => {
        const splitId = split.userId.toString();
        if (balances[splitId]) {
          balances[splitId].balance -= split.amount;
        }
      });
    });

    // Subtract settlements
    settlements.forEach(settlement => {
      const fromId = settlement.from.userId.toString();
      const toId = settlement.to.userId.toString();
      
      if (balances[fromId]) {
        balances[fromId].balance += settlement.amount;
      }
      if (balances[toId]) {
        balances[toId].balance -= settlement.amount;
      }
    });

    res.json(Object.values(balances));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Record settlement
router.post('/:groupId/settle', authMiddleware, async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const settlement = new Settlement({
      groupId: req.params.groupId,
      from,
      to,
      amount
    });

    await settlement.save();
    res.status(201).json(settlement);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get settlements for group
router.get('/:groupId/settlements', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const settlements = await Settlement.find({ groupId: req.params.groupId }).sort({ date: -1 });
    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
