import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getGroup,
  getGroupExpenses,
  createGroupExpense,
  updateGroupExpense,
  deleteGroupExpense,
  getGroupBalance,
  recordSettlement,
  regenerateCode,
  removeMember,
  acceptJoinRequest,
  rejectJoinRequest,
  updateGroupName,
  leaveGroup,
  deleteGroup,
  cleanupExpiredRequests
} from '../api';

const EXPENSE_TYPES = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Education', 'Other'];

export default function GroupDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'Food',
    date: new Date().toISOString().split('T')[0],
    paidBy: null,
    splitAmong: []
  });
  const [settleData, setSettleData] = useState({
    from: null,
    to: null,
    amount: ''
  });

  useEffect(() => {
    loadGroupData();
  }, [id]);

  const loadGroupData = async () => {
    try {
      // Clean up expired requests first
      await cleanupExpiredRequests(id);
      
      const [groupRes, expensesRes, balancesRes] = await Promise.all([
        getGroup(id),
        getGroupExpenses(id),
        getGroupBalance(id)
      ]);
      setGroup(groupRes.data || null);
      setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
      setBalances(Array.isArray(balancesRes.data) ? balancesRes.data : []);
    } catch (error) {
      console.error('Failed to load group data:', error);
      setMessage({ type: 'error', text: 'Failed to load group data' });
      setExpenses([]);
      setBalances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await updateGroupExpense(id, editingExpense._id, formData);
      } else {
        await createGroupExpense(id, formData);
      }
      loadGroupData();
      closeExpenseModal();
      setMessage({ type: 'success', text: 'Expense saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to save expense:', error);
      setMessage({ type: 'error', text: 'Failed to save expense' });
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      amount: expense.amount,
      type: expense.type,
      date: new Date(expense.date).toISOString().split('T')[0],
      paidBy: expense.paidBy,
      splitAmong: expense.splitAmong.map(s => ({ userId: s.userId, username: s.username }))
    });
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteGroupExpense(id, expenseId);
        loadGroupData();
        setMessage({ type: 'success', text: 'Expense deleted!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setEditingExpense(null);
    setFormData({
      title: '',
      amount: '',
      type: 'Food',
      date: new Date().toISOString().split('T')[0],
      paidBy: null,
      splitAmong: []
    });
  };

  const handleRegenerateCode = async () => {
    if (window.confirm('Regenerate join code? The old code will no longer work.')) {
      try {
        const response = await regenerateCode(id);
        setGroup(response.data);
        setMessage({ type: 'success', text: 'Join code regenerated!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } catch (error) {
        console.error('Failed to regenerate code:', error);
      }
    }
  };

  const copyJoinCode = () => {
    navigator.clipboard.writeText(group.joinCode);
    setMessage({ type: 'success', text: 'Join code copied!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/join/${group.joinCode}`;
    navigator.clipboard.writeText(link);
    setMessage({ type: 'success', text: 'Share link copied!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const handleAcceptRequest = async (userId) => {
    try {
      const response = await acceptJoinRequest(id, userId);
      setGroup(response.data);
      setMessage({ type: 'success', text: 'Join request accepted!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      loadGroupData();
    } catch (error) {
      console.error('Failed to accept request:', error);
      setMessage({ type: 'error', text: 'Failed to accept request' });
    }
  };

  const handleRejectRequest = async (userId) => {
    try {
      const response = await rejectJoinRequest(id, userId);
      setGroup(response.data);
      setMessage({ type: 'success', text: 'Join request rejected!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    try {
      const response = await updateGroupName(id, newGroupName);
      setGroup(response.data);
      setShowEditNameModal(false);
      setMessage({ type: 'success', text: 'Group name updated!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to update name:', error);
      setMessage({ type: 'error', text: 'Failed to update name' });
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        await leaveGroup(id);
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to leave group:', error);
        setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to leave group' });
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm('Delete this group? All expenses and data will be permanently deleted.')) {
      try {
        await deleteGroup(id);
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to delete group:', error);
        setMessage({ type: 'error', text: 'Failed to delete group' });
      }
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Remove this member from the group?')) {
      try {
        const response = await removeMember(id, memberId);
        setGroup(response.data);
        loadGroupData();
        setMessage({ type: 'success', text: 'Member removed!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } catch (error) {
        console.error('Failed to remove member:', error);
      }
    }
  };

  const handleSubmitSettlement = async (e) => {
    e.preventDefault();
    try {
      await recordSettlement(id, settleData);
      loadGroupData();
      setShowSettleModal(false);
      setSettleData({ from: null, to: null, amount: '' });
      setMessage({ type: 'success', text: 'Settlement recorded!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to record settlement:', error);
    }
  };

  const toggleSplitMember = (member) => {
    const exists = formData.splitAmong.find(m => m.userId === member.userId);
    if (exists) {
      setFormData({
        ...formData,
        splitAmong: formData.splitAmong.filter(m => m.userId !== member.userId)
      });
    } else {
      setFormData({
        ...formData,
        splitAmong: [...formData.splitAmong, { userId: member.userId, username: member.username }]
      });
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  if (loading) {
    return <div className="loading">Loading group...</div>;
  }

  if (!group) {
    return <div className="error-message">Group not found</div>;
  }

  const isCreator = group.createdBy.toString() === user.id || group.createdBy === user.id;
  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;
  const hasPendingRequests = group.pendingMembers && group.pendingMembers.length > 0;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <button className="btn btn-secondary btn-small" onClick={() => navigate('/dashboard')}>
          ← Back to Groups
        </button>
      </div>

      {message.text && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <h2>{group.name}</h2>
              {isCreator && (
                <button 
                  className="btn btn-secondary btn-small" 
                  onClick={() => {
                    setNewGroupName(group.name);
                    setShowEditNameModal(true);
                  }}
                >
                  Edit Name
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="group-code">{group.joinCode}</div>
              <button className="btn btn-secondary btn-small" onClick={copyJoinCode}>
                Copy Code
              </button>
              <button className="btn btn-secondary btn-small" onClick={copyShareLink}>
                Copy Link
              </button>
              {isCreator && (
                <button className="btn btn-secondary btn-small" onClick={handleRegenerateCode}>
                  Regenerate
                </button>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-small" onClick={() => setShowExpenseModal(true)}>
              Add Expense
            </button>
            {!isCreator && (
              <button className="btn btn-danger btn-small" onClick={handleLeaveGroup}>
                Leave Group
              </button>
            )}
            {isCreator && (
              <button className="btn btn-danger btn-small" onClick={handleDeleteGroup}>
                Delete Group
              </button>
            )}
          </div>
        </div>

        {hasPendingRequests && isCreator && (
          <div className="pending-section">
            <h4>Pending Join Requests</h4>
            <div className="pending-list">
              {group.pendingMembers.map((pending) => (
                <div key={pending.userId} className="pending-item">
                  <div className="pending-info">
                    <div className="pending-username">{pending.username}</div>
                    <div className="pending-time">{formatTimeRemaining(pending.expiresAt)}</div>
                  </div>
                  <div className="pending-actions">
                    <button 
                      className="btn btn-success btn-small" 
                      onClick={() => handleAcceptRequest(pending.userId)}
                    >
                      Accept
                    </button>
                    <button 
                      className="btn btn-danger btn-small" 
                      onClick={() => handleRejectRequest(pending.userId)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Members ({group.members.length})</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {group.members.map((member) => (
            <div
              key={member.userId}
              style={{
                background: 'var(--bg-secondary)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid var(--border)'
              }}
            >
              <span style={{ fontWeight: member.userId === group.createdBy ? 'bold' : 'normal' }}>
                {member.username}
                {member.userId === group.createdBy && ' (Admin)'}
              </span>
              {isCreator && member.userId !== group.createdBy && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    padding: '0 0.25rem'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Balance Summary</h3>
          <button className="btn btn-success btn-small" onClick={() => setShowSettleModal(true)}>
            Record Settlement
          </button>
        </div>
        <div className="balance-list">
          {balances.map((balance) => (
            <div key={balance.userId} className="balance-item">
              <span style={{ fontWeight: 500 }}>{balance.username}</span>
              <span
                className={
                  balance.balance > 0
                    ? 'balance-positive'
                    : balance.balance < 0
                    ? 'balance-negative'
                    : 'balance-zero'
                }
              >
                {balance.balance > 0 ? '+' : ''}₹{Math.abs(balance.balance).toFixed(2)}
                {balance.balance > 0 && ' (gets back)'}
                {balance.balance < 0 && ' (owes)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Expenses</h3>
        {expenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses yet</p>
          </div>
        ) : (
          <>
            <div className="expense-list" style={{ marginTop: '1rem' }}>
              {expenses.map((expense) => (
                <div key={expense._id} className="expense-item">
                  <div className="expense-info">
                    <div className="expense-title">{expense.title}</div>
                    <div className="expense-meta">
                      {expense.type} • Paid by {expense.paidBy.username} • Split: {expense.splitAmong.length} people
                      <br />
                      {new Date(expense.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="expense-amount">₹{expense.amount.toFixed(2)}</div>
                  <div className="expense-actions">
                    <button className="btn btn-secondary btn-small" onClick={() => handleEditExpense(expense)}>
                      Edit
                    </button>
                    <button className="btn btn-danger btn-small" onClick={() => handleDeleteExpense(expense._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="total-section">
              <h3>Total Group Expenses</h3>
              <div className="total-amount">₹{totalExpenses.toFixed(2)}</div>
            </div>
          </>
        )}
      </div>

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <div className="modal-overlay" onClick={() => setShowEditNameModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Group Name</h2>
              <button className="modal-close" onClick={() => setShowEditNameModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateName}>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditNameModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal - keeping existing one but showing split here */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={closeExpenseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="modal-close" onClick={closeExpenseModal}>×</button>
            </div>
            <form onSubmit={handleSubmitExpense}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {EXPENSE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Paid By</label>
                <select
                  value={formData.paidBy?.userId || ''}
                  onChange={(e) => {
                    const member = group.members.find(m => m.userId === e.target.value);
                    setFormData({ ...formData, paidBy: { userId: member.userId, username: member.username } });
                  }}
                  required
                >
                  <option value="">Select member</option>
                  {group.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Split Among (₹{formData.amount && formData.splitAmong.length > 0 ? (formData.amount / formData.splitAmong.length).toFixed(2) : '0'} each)</label>
                <div className="checkbox-group">
                  {group.members.map((member) => (
                    <div key={member.userId} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.splitAmong.some(m => m.userId === member.userId)}
                        onChange={() => toggleSplitMember(member)}
                        id={`split-${member.userId}`}
                      />
                      <label htmlFor={`split-${member.userId}`}>{member.username}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeExpenseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formData.splitAmong.length === 0}>
                  {editingExpense ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettleModal && (
        <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Settlement</h2>
              <button className="modal-close" onClick={() => setShowSettleModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmitSettlement}>
              <div className="form-group">
                <label>From (Who Paid)</label>
                <select
                  value={settleData.from?.userId || ''}
                  onChange={(e) => {
                    const member = group.members.find(m => m.userId === e.target.value);
                    setSettleData({ ...settleData, from: { userId: member.userId, username: member.username } });
                  }}
                  required
                >
                  <option value="">Select member</option>
                  {group.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>To (Who Received)</label>
                <select
                  value={settleData.to?.userId || ''}
                  onChange={(e) => {
                    const member = group.members.find(m => m.userId === e.target.value);
                    setSettleData({ ...settleData, to: { userId: member.userId, username: member.username } });
                  }}
                  required
                >
                  <option value="">Select member</option>
                  {group.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settleData.amount}
                  onChange={(e) => setSettleData({ ...settleData, amount: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSettleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Record Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
