// components/ActivityHistory.tsx
import React, { useState } from 'react';
import { Activity, Customer } from '../types/customer';
import { History, Plus, User } from 'lucide-react';

interface ActivityHistoryProps {
  customer: Customer;
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ customer, onAddActivity }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivityDescription, setNewActivityDescription] = useState('');

  const handleAddActivity = () => {
    if (newActivityDescription.trim()) {
      onAddActivity({
        user: 'Current User', // 实际应用中应从认证上下文获取当前用户
        description: newActivityDescription,
        timestamp: new Date().toLocaleString(),
        isRecent: true
      });
      setNewActivityDescription('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="text-primary" size={20} />
          Recent Activity
        </h3>
        <button
          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : <><Plus size={14} /> Add Note</>}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700">
          <textarea
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 text-black dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
            placeholder="Add a note about this customer..."
            rows={3}
            value={newActivityDescription}
            onChange={(e) => setNewActivityDescription(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <button
              className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 hover:bg-primary/90 transition-all"
              onClick={handleAddActivity}
            >
              Add Note
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {customer.activities && customer.activities.length > 0 ? (
          customer.activities.map((activity, index) => (
            <div key={activity.id || index} className="flex gap-4">
              <div className="relative flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full ${
                  activity.isRecent ? 'bg-primary ring-4 ring-primary/20' : 'bg-slate-300 dark:bg-slate-700'
                } mt-1.5 z-10`}></div>
                {index < (customer.activities?.length || 0) - 1 && (
                  <div className="w-px h-full bg-slate-200 dark:bg-slate-800 absolute top-3"></div>
                )}
              </div>
              <div className={index < (customer.activities?.length || 0) - 1 ? "pb-4" : ""}>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {activity.user && (
                    <span className="font-semibold text-slate-900 dark:text-white">{activity.user}</span>
                  )}{' '}
                  {activity.description}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-tight">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p>No activity records yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityHistory;