import { useState, useEffect } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api';

const EXPENSE_TYPES = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Education', 'Other'];

const TYPE_COLORS = {
  Food:          '#6366f1',
  Transport:     '#10b981',
  Entertainment: '#f59e0b',
  Shopping:      '#ef4444',
  Bills:         '#8b5cf6',
  Healthcare:    '#06b6d4',
  Education:     '#f97316',
  Other:         '#64748b',
};

function PieChart({ data }) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = -Math.PI / 2;
  const cx = 100, cy = 100, r = 80;

  const slices = data.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return {
      ...d,
      path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`,
      pct: ((d.value / total) * 100).toFixed(1)
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 200 200" width="180" height="180" style={{ flexShrink: 0 }}>
        {slices.map((s) => (
          <path key={s.label} d={s.path} fill={s.color} stroke="var(--bg-primary)" strokeWidth="2">
            <title>{s.label}: Rs.{s.value.toFixed(2)} ({s.pct}%)</title>
          </path>
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {slices.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            <span style={{ fontWeight: 600, marginLeft: 'auto', paddingLeft: '0.5rem' }}>₹{s.value.toFixed(0)}</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data }) {
  if (data.length < 2) return (
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem 0' }}>
      Add expenses across multiple months to see the trend.
    </div>
  );

  const W = 420, H = 180, PAD = { top: 16, right: 16, bottom: 40, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const xStep = innerW / (data.length - 1);

  const pts = data.map((d, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + innerH - (d.total / maxVal) * innerH,
    label: d.label,
    total: d.total,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${PAD.top + innerH} ` +
    pts.map(p => `L${p.x},${p.y}`).join(' ') +
    ` L${pts[pts.length - 1].x},${PAD.top + innerH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD.top + innerH - f * innerH,
    val: (f * maxVal).toFixed(0),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={t.y} x2={PAD.left + innerW} y2={t.y}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
          <text x={PAD.left - 6} y={t.y + 4} textAnchor="end"
            fontSize="10" fill="var(--text-tertiary)">₹{Number(t.val).toLocaleString()}</text>
        </g>
      ))}
      <path d={area} fill="url(#lineGrad)" />
      <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="#6366f1" stroke="var(--bg-primary)" strokeWidth="2" />
          <text x={p.x} y={PAD.top + innerH + 18} textAnchor="middle"
            fontSize="10" fill="var(--text-secondary)">{p.label}</text>
          <title>{p.label}: ₹{p.total.toFixed(2)}</title>
        </g>
      ))}
    </svg>
  );
}

export default function SoloExpenses() {
  const [expenses, setExpenses]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [view, setView]                     = useState('list');
  const [chartFilter, setChartFilter]       = useState('month');
  const [showModal, setShowModal]           = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting]         = useState(false);
  const [collapsed, setCollapsed]           = useState({});
  const [formData, setFormData]             = useState({
    title: '', amount: '', type: 'Food',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => {
    try {
      const res = await getExpenses();
      setExpenses(Array.isArray(res.data) ? res.data : []);
    } catch { setExpenses([]); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingExpense) await updateExpense(editingExpense._id, formData);
      else await createExpense(formData);
      loadExpenses();
      closeModal();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title, amount: expense.amount,
      type: expense.type,
      date: new Date(expense.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this expense?')) {
      try { await deleteExpense(id); loadExpenses(); }
      catch (err) { console.error(err); }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData({ title: '', amount: '', type: 'Food', date: new Date().toISOString().split('T')[0] });
  };

  const toggleCollapse = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // Group by month
  const groupedByMonth = expenses.reduce((acc, exp) => {
    const d = new Date(exp.date);
    const key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});
  const monthKeys = Object.keys(groupedByMonth);

  // Chart data
  const now = new Date();
  const filterLabel = chartFilter === 'month'
    ? now.toLocaleString('default', { month: 'long', year: 'numeric' })
    : String(now.getFullYear());

  const filteredForCharts = expenses.filter(exp => {
    const d = new Date(exp.date);
    if (chartFilter === 'month')
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear();
  });

  const pieData = EXPENSE_TYPES.map(type => ({
    label: type, color: TYPE_COLORS[type],
    value: filteredForCharts.filter(e => e.type === type).reduce((s, e) => s + e.amount, 0)
  })).filter(d => d.value > 0);

  const lineData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const label = d.toLocaleString('default', { month: 'short' }) +
      (d.getFullYear() !== now.getFullYear() ? ` '${String(d.getFullYear()).slice(2)}` : '');
    const total = expenses
      .filter(e => { const ed = new Date(e.date); return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear(); })
      .reduce((s, e) => s + e.amount, 0);
    return { label, total };
  });

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) return <div className="loading">Loading expenses...</div>;

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h2>Solo Expenses</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn btn-small ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}>
            📋 List
          </button>
          <button className={`btn btn-small ${view === 'charts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('charts')}>
            📊 Charts
          </button>
          <button className="btn btn-primary btn-small" onClick={() => setShowModal(true)}>
            + Add
          </button>
        </div>
      </div>

      {/* Charts view */}
      {view === 'charts' && (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Showing:</span>
              <button className={`btn btn-small ${chartFilter === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChartFilter('month')}>
                This Month
              </button>
              <button className={`btn btn-small ${chartFilter === 'year' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChartFilter('year')}>
                This Year
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>— {filterLabel}</span>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Spending by Category</h3>
            {pieData.length === 0
              ? <p style={{ color: 'var(--text-secondary)' }}>No expenses for {filterLabel}.</p>
              : <PieChart data={pieData} />}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Monthly Trend (Last 12 Months)</h3>
            <LineChart data={lineData} />
          </div>
        </>
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          {expenses.length === 0 ? (
            <div className="empty-state">
              <h3>No expenses yet</h3>
              <p>Start tracking your expenses by adding your first one!</p>
            </div>
          ) : (
            <>
              {monthKeys.map((monthKey) => {
                const group = groupedByMonth[monthKey];
                const monthTotal = group.reduce((s, e) => s + e.amount, 0);
                const isCollapsed = collapsed[monthKey];
                return (
                  <div key={monthKey} style={{ marginBottom: '1rem' }}>
                    <div
                      onClick={() => toggleCollapse(monthKey)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: isCollapsed ? '10px' : '10px 10px 0 0',
                        cursor: 'pointer', userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{
                          fontSize: '0.9rem', display: 'inline-block',
                          transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}>▼</span>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{monthKey}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                          ({group.length} expense{group.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{monthTotal.toFixed(2)}</span>
                    </div>

                    {!isCollapsed && (
                      <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                        {group.map((expense, idx) => (
                          <div
                            key={expense._id}
                            className="expense-item"
                            style={{ borderBottom: idx < group.length - 1 ? '1px solid var(--border)' : 'none', borderRadius: 0 }}
                          >
                            <div className="expense-info">
                              <div className="expense-title">{expense.title}</div>
                              <div className="expense-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[expense.type] || '#64748b' }} />
                                {expense.type} • {new Date(expense.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="expense-amount">₹{expense.amount.toFixed(2)}</div>
                            <div className="expense-actions">
                              <button className="btn btn-secondary btn-small" onClick={() => handleEdit(expense)}>Edit</button>
                              <button className="btn btn-danger btn-small" onClick={() => handleDelete(expense._id)}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="total-section">
                <h3>Total All Time</h3>
                <div className="total-amount">₹{totalAll.toFixed(2)}</div>
              </div>
            </>
          )}
        </>
      )}

      {/* Modal */}
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
                <input type="text" value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input type="number" step="0.01" value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  onWheel={(e) => e.target.blur()} required min="0" />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  {EXPENSE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingExpense ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
