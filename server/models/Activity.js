import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  type: {
    type: String,
    required: true,
    enum: [
      'expense_created',
      'expense_updated', 
      'expense_deleted',
      'group_created',
      'group_updated',
      'group_joined',
      'group_left',
      'group_deleted',
      'member_removed',
      'settlement_recorded'
    ]
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ groupId: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
