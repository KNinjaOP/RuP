import express from 'express';
import crypto from 'crypto';
import Group from '../models/Group.js';
import User from '../models/User.js';
import GroupExpense from '../models/GroupExpense.js';
import Settlement from '../models/Settlement.js';
import { authMiddleware } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

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
      pendingMembers: [],
      joinCode: generateJoinCode()
    });

    await group.save();
    
    // Log activity
    await logActivity({
      userId: req.userId,
      groupId: group._id,
      type: 'group_created',
      action: `Created group "${name}"`,
      details: { groupId: group._id, groupName: name }
    });
    
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

// Join group with code (creates pending request)
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

    // Check if already has pending request
    const hasPendingRequest = group.pendingMembers.some(m => m.userId.toString() === req.userId);
    if (hasPendingRequest) {
      return res.status(400).json({ message: 'Join request already pending' });
    }

    // Add to pending members with 24-hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    group.pendingMembers.push({
      userId: req.userId,
      username: user.username,
      requestedAt: new Date(),
      expiresAt
    });

    await group.save();
    
    // Log activity
    await logActivity({
      userId: req.userId,
      groupId: group._id,
      type: 'group_joined',
      action: `Requested to join group "${group.name}"`,
      details: { groupId: group._id, groupName: group.name, status: 'pending' }
    });
    
    res.json({ message: 'Join request sent. Waiting for approval.', group });
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

// Accept join request
router.post('/:id/accept/:userId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    const pendingMember = group.pendingMembers.find(
      m => m.userId.toString() === req.params.userId
    );

    if (!pendingMember) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    // Move from pending to members
    group.members.push({
      userId: pendingMember.userId,
      username: pendingMember.username,
      joinedAt: new Date()
    });

    group.pendingMembers = group.pendingMembers.filter(
      m => m.userId.toString() !== req.params.userId
    );

    await group.save();

    // Log activity
    await logActivity({
      userId: pendingMember.userId,
      groupId: group._id,
      type: 'group_joined',
      action: `Joined group "${group.name}"`,
      details: { groupId: group._id, groupName: group.name, status: 'accepted' }
    });

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject join request
router.post('/:id/reject/:userId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    group.pendingMembers = group.pendingMembers.filter(
      m => m.userId.toString() !== req.params.userId
    );

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update group name
router.patch('/:id/name', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    
    const group = await Group.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or unauthorized' });
    }

    const oldName = group.name;
    group.name = name;
    await group.save();

    // Log activity
    await logActivity({
      userId: req.userId,
      groupId: group._id,
      type: 'group_updated',
      action: `Renamed group from "${oldName}" to "${name}"`,
      details: { groupId: group._id, oldName, newName: name }
    });

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Leave group
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Can't leave if you're the creator
    if (group.createdBy.toString() === req.userId) {
      return res.status(400).json({ message: 'Creator cannot leave group. Delete it instead.' });
    }

    const member = group.members.find(m => m.userId.toString() === req.userId);
    
    group.members = group.members.filter(
      m => m.userId.toString() !== req.userId
    );

    await group.save();

    // Log activity
    await logActivity({
      userId: req.userId,
      groupId: group._id,
      type: 'group_left',
      action: `Left group "${group.name}"`,
      details: { groupId: group._id, groupName: group.name, username: member.username }
    });

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Clean up expired join requests (called periodically)
router.post('/:id/cleanup-expired', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const now = new Date();
    group.pendingMembers = group.pendingMembers.filter(
      m => m.expiresAt > now
    );

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
