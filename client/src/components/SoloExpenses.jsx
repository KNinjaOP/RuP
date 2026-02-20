import { useState, useEffect } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api';

const EXPENSE_TYPES = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Education', 'Other'];

export default function SoloExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'Food',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const response = await getExpenses();
      setExpenses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingExpense) {
        await updateExpense(editingExpense._id, formData);
      } else {
        await createExpense(formData);
      }
      loadExpenses();
      closeModal();
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      amount: expense.amount,
      type: expense.type,
      date: new Date(expense.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(id);
        loadExpenses();
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData({
      title: '',
      amount: '',
      type: 'Food',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;

  if (loading) {
    return <div className="loading">Loading expenses...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Solo Expenses</h2>
        <button className="btn btn-primary btn-small" onClick={() => setShowModal(true)}>
          Add Expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">
          <h3>No expenses yet</h3>
          <p>Start tracking your expenses by adding your first one!</p>
        </div>
      ) : (
        <>
          <div className="expense-list">
            {expenses.map((expense) => (
              <div key={expense._id} className="expense-item">
                <div className="expense-info">
                  <div className="expense-title">{expense.title}</div>
                  <div className="expense-meta">
                    {expense.type} • {new Date(expense.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="expense-amount">₹{expense.amount.toFixed(2)}</div>
                <div className="expense-actions">
                  <button className="btn btn-secondary btn-small" onClick={() => handleEdit(expense)}>
                    Edit
                  </button>
                  <button className="btn btn-danger btn-small" onClick={() => handleDelete(expense._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="total-section">
            <h3>Total Expenses</h3>
            <div className="total-amount">₹{totalExpenses.toFixed(2)}</div>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
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
                <label>Amount</label>
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
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
