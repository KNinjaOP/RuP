import express from 'express';
import GroupExpense from '../models/GroupExpense.js';
import Group from '../models/Group.js';
import Settlement from '../models/Settlement.js';
import { authMiddleware } from '../middleware/auth.js';

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
