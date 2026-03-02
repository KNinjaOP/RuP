import Activity from '../models/Activity.js';

export const logActivity = async (data) => {
  try {
    const activity = new Activity({
      ...data,
      username: data.username || 'Unknown'
    });
    await activity.save();
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging shouldn't break main operations
  }
};
