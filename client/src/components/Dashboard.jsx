import { useState } from 'react';
import SoloExpenses from './SoloExpenses';
import Groups from './Groups';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('solo');

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
      </div>

      {activeTab === 'solo' ? <SoloExpenses /> : <Groups />}
    </div>
  );
}
