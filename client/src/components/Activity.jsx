import { useState, useEffect } from 'react';
import { getAllActivities } from '../api';

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const response = await getAllActivities();
      setActivities(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'expense_created':
        return '💰';
      case 'expense_updated':
        return '✏️';
      case 'expense_deleted':
        return '🗑️';
      case 'group_created':
        return '👥';
      case 'group_updated':
        return '✏️';
      case 'group_joined':
        return '👋';
      case 'group_left':
        return '👋';
      case 'group_deleted':
        return '🗑️';
      case 'member_removed':
        return '❌';
      case 'settlement_recorded':
        return '💸';
      default:
        return '📌';
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderActivityDetails = (activity) => {
    const details = activity.details;
    if (!details) return null;

    const detailItems = [];

    if (activity.type === 'expense_created') {
      if (details.paidBy) detailItems.push(`Paid by: ${details.paidBy}`);
      if (details.splitAmong) detailItems.push(`Split among: ${details.splitAmong}`);
    }

    if (activity.type === 'expense_updated') {
      if (details.oldAmount && details.amount && details.oldAmount !== details.amount) {
        detailItems.push(`Amount: ₹${details.oldAmount} → ₹${details.amount}`);
      }
      if (details.oldTitle && details.oldTitle !== details.title) {
        detailItems.push(`Title: "${details.oldTitle}" → "${details.title}"`);
      }
      if (details.oldType && details.oldType !== details.type) {
        detailItems.push(`Type: ${details.oldType} → ${details.type}`);
      }
    }

    if (activity.type === 'expense_deleted') {
      if (details.paidBy) detailItems.push(`Was paid by: ${details.paidBy}`);
      if (details.splitAmong) detailItems.push(`Was split among: ${details.splitAmong}`);
    }

    if (activity.type === 'settlement_recorded') {
      if (details.from && details.to && details.amount) {
        detailItems.push(`${details.from} → ${details.to}: ₹${details.amount}`);
      }
      if (details.recordedBy) detailItems.push(`Recorded by: ${details.recordedBy}`);
    }

    if (detailItems.length === 0) return null;

    return (
      <div style={{ 
        fontSize: '0.8rem', 
        color: 'var(--text-secondary)', 
        marginTop: '0.25rem',
        paddingLeft: '0.5rem',
        borderLeft: '2px solid var(--border)'
      }}>
        {detailItems.map((item, idx) => (
          <div key={idx}>• {item}</div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading activities...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Activity</h2>
        <button className="btn btn-secondary btn-small" onClick={loadActivities}>
          Refresh
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="empty-state">
          <h3>No activity yet</h3>
          <p>Your actions will appear here</p>
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((activity) => (
            <div key={activity._id} className="activity-item">
              <div className="activity-icon">{getActivityIcon(activity.type)}</div>
              <div className="activity-content">
                <div className="activity-action">{activity.action}</div>
                {renderActivityDetails(activity)}
                <div className="activity-time">{formatDate(activity.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
