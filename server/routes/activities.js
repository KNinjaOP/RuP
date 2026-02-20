import express from 'express';
import Activity from '../models/Activity.js';
import Group from '../models/Group.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get user's personal activities
router.get('/personal', authMiddleware, async (req, res) => {
  try {
    const activities = await Activity.find({ 
      userId: req.userId,
      groupId: { $exists: false }
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get group activities
router.get('/group/:groupId', authMiddleware, async (req, res) => {
  try {
    // Verify user is member
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.userId': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const activities = await Activity.find({ 
      groupId: req.params.groupId
    })
    .sort({ createdAt: -1 })
    .limit(100);
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all activities (combined personal + all groups)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    // Get user's groups
    const groups = await Group.find({
      'members.userId': req.userId
    });
    
    const groupIds = groups.map(g => g._id);

    // Get activities from user's personal expenses and all their groups
    const activities = await Activity.find({
      $or: [
        { userId: req.userId, groupId: { $exists: false } },
        { groupId: { $in: groupIds } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(100);
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
