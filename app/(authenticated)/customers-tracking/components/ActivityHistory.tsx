// components/ActivityHistory.tsx
import React, { useState } from 'react';
import { Customer as CustomerType } from '@/lib/pocketbase/services/customers';
import { History, Plus, User } from 'lucide-react';

// 定义活动类型
interface Activity {
  id: string;
  user: string;
  description: string;
  timestamp: string;
  isRecent?: boolean;
}

// 扩展客户类型以包含跟踪相关属性
interface Customer extends CustomerType {
  priority?: 'Low' | 'Medium' | 'High';
  contactStatus?: 'Contacted' | 'Replied' | 'No Reply';
  nextActionIcon?: 'event' | 'schedule' | 'warning' | 'check_circle' | 'calendar' | 'clock' | 'alert_triangle' | 'check';
  nextActionText?: string;
  nextStepAction?: string;
  nextStepDate?: string;
  notes?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactWeChat?: string;
  contactAvatar?: string;
  status?: 'Active' | 'Lead' | 'Follow-up' | 'Onboarded';
  teamMembers?: TeamMember[];
  activities?: Activity[];
  tracking?: {
    id?: string;
    customer_id: string;
    status: 'Active' | 'Lead' | 'Follow-up' | 'Onboarded';
    priority: 'Low' | 'Medium' | 'High';
    contact_status: 'Contacted' | 'Replied' | 'No Reply';
    next_action_icon: 'event' | 'schedule' | 'warning' | 'check_circle' | 'calendar' | 'clock' | 'alert_triangle' | 'check';
    next_action_text: string;
    next_step_action: string;
    next_step_date: string;
    notes: string;
  };
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
}

interface ActivityHistoryProps {
  customer: Customer;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ customer }) => {
  // 格式化时间戳为友好格式
  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      
      // 检查是否为有效日期
      if (isNaN(date.getTime())) {
        return isoString; // 如果不是有效日期，则返回原始字符串
      }
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return `Today • ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return isoString; // 发生错误时返回原始字符串
    }
  };

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="text-primary" size={20} />
          Recent Activity
        </h3>
      </div>

      <div className="space-y-4">
        {customer.activities && customer.activities.length > 0 ? (
          (() => {
            const sortedActivities = [...customer.activities].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            return sortedActivities.map((activity, index) => (
              <div key={activity.id || index} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${
                    index === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-slate-300 dark:bg-slate-700'
                  } mt-1.5 z-10`}></div>
                  {index < sortedActivities.length - 1 && (
                    <div className="w-px h-full bg-slate-200 dark:bg-slate-800 absolute top-3"></div>
                  )}
                </div>
                <div className={index < sortedActivities.length - 1 ? "pb-4" : ""}>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {activity.user && (
                      <span className="font-semibold text-slate-900 dark:text-white">{activity.user}</span>
                    )}{' '}
                    <span dangerouslySetInnerHTML={{ __html: activity.description }} />
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 capitalize tracking-tight">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ));
          })()
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