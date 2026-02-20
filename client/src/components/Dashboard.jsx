import { useState, useEffect } from 'react';
import SoloExpenses from './SoloExpenses';
import Groups from './Groups';
import Activity from './Activity';

export default function Dashboard() {
  // Load last tab from localStorage
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('lastTab') || 'solo';
  });

  // Save tab when it changes
  useEffect(() => {
    localStorage.setItem('lastTab', activeTab);
  }, [activeTab]);

  return (
    <div className="main-content">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'solo' ? 'active' : ''}`}
          onClick={() => setActiveTab('solo')}
        >
          Solo Expenses
        </button>
        <button
          className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
        <button
          className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
      </div>

      {activeTab === 'solo' && <SoloExpenses />}
      {activeTab === 'groups' && <Groups />}
      {activeTab === 'activity' && <Activity />}
    </div>
  );
}
