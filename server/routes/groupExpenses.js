import express from 'express';
import GroupExpense from '../models/GroupExpense.js';
import Group from '../models/Group.js';
import Settlement from '../models/Settlement.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

const getUsername = async (userId) => {
  try {
    const user = await User.findById(userId).select('username');
    return user ? user.username : 'Unknown';
  } catch { return 'Unknown'; }
};

// ⚠️ SPECIFIC routes MUST come before /:groupId to avoid Express matching them wrong

// Get balance summary
router.get('/:groupId/get-balance', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, 'members.userId': req.userId });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const expenses = await GroupExpense.find({ groupId: req.params.groupId });
    const settlements = await Settlement.find({ groupId: req.params.groupId });

    // Overall balance totals
    const balances = {};
    group.members.forEach(member => {
      balances[member.userId.toString()] = { userId: member.userId, username: member.username, balance: 0 };
    });
    expenses.forEach(expense => {
      const paidById = expense.paidBy.userId.toString();
      if (balances[paidById]) balances[paidById].balance += expense.amount;
      expense.splitAmong.forEach(split => {
        const splitId = split.userId.toString();
        if (balances[splitId]) balances[splitId].balance -= split.amount;
      });
    });
    settlements.forEach(s => {
      const fromId = s.from.userId.toString();
      const toId = s.to.userId.toString();
      if (balances[fromId]) balances[fromId].balance += s.amount;
      if (balances[toId]) balances[toId].balance -= s.amount;
    });

    // Pair net balances
    const net = {};
    const addDebt = (fromId, fromName, toId, toName, amount) => {
      if (fromId === toId) return;
      const [keyA, keyB] = fromId < toId ? [fromId, toId] : [toId, fromId];
      const [nameA, nameB] = fromId < toId ? [fromName, toName] : [toName, fromName];
      const sign = fromId < toId ? 1 : -1;
      const pairKey = `${keyA}_${keyB}`;
      if (!net[pairKey]) net[pairKey] = { idA: keyA, nameA, idB: keyB, nameB, amount: 0 };
      net[pairKey].amount += sign * amount;
    };

    expenses.forEach(expense => {
      const paidById = expense.paidBy.userId.toString();
      const paidByName = expense.paidBy.username;
      expense.splitAmong.forEach(split => {
        const splitId = split.userId.toString();
        if (splitId !== paidById) {
          addDebt(splitId, split.username, paidById, paidByName, split.amount);
        }
      });
    });

    settlements.forEach(s => {
      addDebt(s.from.userId.toString(), s.from.username, s.to.userId.toString(), s.to.username, -s.amount);
    });

    const debtStatements = Object.values(net)
      .filter(pair => Math.abs(pair.amount) > 0.01)
      .map(pair => pair.amount > 0
        ? { fromUsername: pair.nameA, toUsername: pair.nameB, amount: parseFloat(pair.amount.toFixed(2)) }
        : { fromUsername: pair.nameB, toUsername: pair.nameA, amount: parseFloat(Math.abs(pair.amount).toFixed(2)) }
      );

    res.json({ balances: Object.values(balances), debtStatements });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get settlements
router.get('/:groupId/get-settlements', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, 'members.userId': req.userId });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const settlements = await Settlement.find({ groupId: req.params.groupId }).sort({ date: -1 });
    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Record settlement
router.post('/:groupId/settle', authMiddleware, async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    const group = await Group.findOne({ _id: req.params.groupId, 'members.userId': req.userId });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const settlement = new Settlement({ groupId: req.params.groupId, from, to, amount });
    await settlement.save();

    const actingUsername = await getUsername(req.userId);
    await logActivity({
      userId: req.userId, username: actingUsername, groupId: req.params.groupId,
      type: 'settlement_recorded',
      action: `${from.username} paid ${to.username} ₹${amount} (recorded by ${actingUsername})`,
      details: { from: from.username, to: to.username, amount, recordedBy: actingUsername }
    });

    res.status(201).json(settlement);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all expenses for a group — MUST be after specific routes above
router.get('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, 'members.userId': req.userId });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const expenses = await GroupExpense.find({ groupId: req.params.groupId }).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create group expense
router.post('/:groupId', authMiddleware, async (req, res) => {
  try {
    const { title, amount, type, date, paidBy, splitAmong } = req.body;
    const group = await Group.findOne({ _id: req.params.groupId, 'members.userId': req.userId });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const splitAmount = amount / splitAmong.length;
    const splitWithAmounts = splitAmong.map(member => ({ ...member, amount: parseFloat(splitAmount.toFixed(2)) }));

    const expense = new GroupExpense({
      groupId: req.params.groupId, title, amount, type,
      date: date || new Date(), paidBy, splitAmong: splitWithAmounts
    });
    await expense.save();

    const actingUsername = await getUsername(req.userId);
    const splitNames = splitAmong.map(m => m.username).join(', ');
    await logActivity({
      userId: req.userId, username: actingUsername, groupId: req.params.groupId,
      type: 'expense_created',
      action: `${actingUsername} added "${title}" (₹${amount}) — paid by ${paidBy.username}, split among: ${splitNames}`,
      details: { expenseId: expense._id, title, amount, type, paidBy: paidBy.username, splitAmong: splitNames, splitCount: splitAmong.length }
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
    const group = await Group.findOne({ _id: req.params.groupId, 'members.userId': req.userId });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const oldExpense = await GroupExpense.findOne({ _id: req.params.id, groupId: req.params.groupId });
    const splitAmount = amount / splitAmong.length;
    const splitWithAmounts = splitAmong.map(member => ({ ...member, amount: parseFloat(splitAmount.toFixed(2)) }));

    const expense = await GroupExpense.findOneAndUpdate(
      { _id: req.params.id, groupId: req.params.groupId },
      { title, amount, type, date, paidBy, splitAmong: splitWithAmounts },
      { new: true }
    );
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const changes = [];
    if (oldExpense.title !== title) changes.push(`title: "${oldExpense.title}" → "${title}"`);
    if (oldExpense.amount !== amount) changes.push(`amount: ₹${oldExpense.amount} → ₹${amount}`);
    if (oldExpense.type !== type) changes.push(`type: ${oldExpense.type} → ${type}`);
    if (oldExpense.paidBy.username !== paidBy.username) changes.push(`paid by: ${oldExpense.paidBy.username} → ${paidBy.username}`);
    const changeText = changes.length > 0 ? ` (${changes.join(', ')})` : ' (no changes)';

    const actingUsername = await getUsername(req.userId);
    await logActivity({
      userId: req.userId, username: actingUsername, groupId: req.params.groupId,
      type: 'expense_updated',
      action: `${actingUsername} updated "${title}"${changeText}`,
      details: { expenseId: expense._id, title, amount, type, oldTitle: oldExpense.title, oldAmount: oldExpense.amount, oldType: oldExpense.type }
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete group expense
router.delete('/:groupId/:id', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, 'members.userId': req.userId });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const expense = await GroupExpense.findOneAndDelete({ _id: req.params.id, groupId: req.params.groupId });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const actingUsername = await getUsername(req.userId);
    await logActivity({
      userId: req.userId, username: actingUsername, groupId: req.params.groupId,
      type: 'expense_deleted',
      action: `${actingUsername} deleted "${expense.title}" (₹${expense.amount}) — balances updated automatically`,
      details: {
        title: expense.title, amount: expense.amount, type: expense.type,
        paidBy: expense.paidBy.username,
        splitAmong: expense.splitAmong.map(s => s.username).join(', ')
      }
    });

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
