import express from 'express';
import crypto from 'crypto';
import Group from '../models/Group.js';
import User from '../models/User.js';
import GroupExpense from '../models/GroupExpense.js';
import Settlement from '../models/Settlement.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Generate unique join code
const generateJoinCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Get all groups for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.userId': req.userId
    }).sort({ createdAt: -1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single group
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create group
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.userId);

    const group = new Group({
      name,
      createdBy: req.userId,
      members: [{
        userId: req.userId,
        username: user.username
      }],
      joinCode: generateJoinCode()
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Regenerate join code
router.post('/:id/regenerate-code', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    group.joinCode = generateJoinCode();
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join group with code
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { joinCode } = req.body;
    const user = await User.findById(req.userId);

    const group = await Group.findOne({ joinCode: joinCode.toUpperCase() });

    if (!group) {
      return res.status(404).json({ message: 'Invalid join code' });
    }

    // Check if already a member
    const isMember = group.members.some(m => m.userId.toString() === req.userId);
    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    group.members.push({
      userId: req.userId,
      username: user.username
    });

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove member from group
router.delete('/:id/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    group.members = group.members.filter(
      m => m.userId.toString() !== req.params.memberId
    );

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete group
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    await Group.deleteOne({ _id: req.params.id });
    await GroupExpense.deleteMany({ groupId: req.params.id });
    await Settlement.deleteMany({ groupId: req.params.id });

    res.json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
