import { useState, useEffect } from 'react';
import { getGroups, createGroup, joinGroup, deleteGroup } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await getGroups();
      setGroups(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await createGroup({ name: groupName });
      loadGroups();
      setShowCreateModal(false);
      setGroupName('');
    } catch (error) {
      setError('Failed to create group');
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await joinGroup(joinCode);
      loadGroups();
      setShowJoinModal(false);
      setJoinCode('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to join group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group? All expenses will be deleted.')) {
      try {
        await deleteGroup(groupId);
        loadGroups();
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading groups...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2>Groups</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-small" onClick={() => setShowJoinModal(true)}>
            Join Group
          </button>
          <button className="btn btn-primary btn-small" onClick={() => setShowCreateModal(true)}>
            Create Group
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <h3>No groups yet</h3>
          <p>Create a group or join one using a code!</p>
        </div>
      ) : (
        <div className="group-list">
          {groups.map((group) => (
            <div key={group._id} className="group-card" onClick={() => navigate(`/groups/${group._id}`)}>
              <div className="group-header">
                <div className="group-name">{group.name}</div>
                <div className="group-code">{group.joinCode}</div>
              </div>
              <div className="group-members">
                {group.members.length} member{group.members.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Group</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  placeholder="Trip to Goa"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Join Group</h2>
              <button className="modal-close" onClick={() => setShowJoinModal(false)}>×</button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleJoinGroup}>
              <div className="form-group">
                <label>Join Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                  placeholder="ABC123DE"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
