'use client';

import React from 'react';
import { Customer as CustomerType } from '@/lib/pocketbase/services/customers';
import { useSearchAndFilter } from '../hooks/useSearchAndFilter';
import { usePagination } from '../hooks/usePagination';
import { Search, Filter, User, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

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

interface Activity {
  id: string;
  user: string;
  description: string;
  timestamp: string;
  isRecent?: boolean;
}

// 获取下一步行动的显示文本
const getNextActionDisplayText = (customer: Customer): string => {
  // 优先使用手动输入的行动文本，但排除默认值
  const manualText = customer.tracking?.next_action_text || customer.nextActionText;
  if (manualText && manualText.trim() && manualText !== 'No upcoming action') {
    return manualText;
  }

  // 如果没有手动文本，基于日期和行动类型生成
  const nextStepDate = customer.tracking?.next_step_date || customer.nextStepDate;
  const nextStepAction = customer.tracking?.next_step_action || customer.nextStepAction;

  if (nextStepDate) {
    const today = new Date();
    const actionDate = new Date(nextStepDate);
    const diffTime = actionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const actionVerb = nextStepAction || 'Follow-up';

    if (diffDays < 0) {
      return `${actionVerb} overdue`;
    } else if (diffDays === 0) {
      return `${actionVerb} today`;
    } else if (diffDays === 1) {
      return `${actionVerb} tomorrow`;
    } else if (diffDays <= 7) {
      return `${actionVerb} in ${diffDays} days`;
    } else {
      // 格式化日期
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric'
      };
      const formattedDate = actionDate.toLocaleDateString('en-US', options);
      return `${actionVerb} on ${formattedDate}`;
    }
  }

  // 如果既没有手动文本也没有日期信息
  return 'No upcoming action';
};

interface CustomerListSidebarProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string) => void;
}

const CustomerListSidebar: React.FC<CustomerListSidebarProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer
}) => {
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredCustomers,
    statusCounts
  } = useSearchAndFilter({ customers });

  // 使用分页hook
  const {
    currentItems: paginatedCustomers,
    currentPage,
    maxPage,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage
  } = usePagination({ items: filteredCustomers, itemsPerPage: 5 }); // 每页显示5个客户

  return (
    <div className="w-full lg:w-[400px] xl:w-[480px] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
      {/* 搜索和筛选区域 */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" size={16} />
          <input
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-700 transition-all"
            placeholder="Find clients..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1.5 ${
                statusFilter === 'all' 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              } text-xs font-semibold rounded-full whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors`}
              onClick={() => setStatusFilter('all')}
            >
              All Clients ({customers.length})
            </button>
            <button
              className={`px-3 py-1.5 ${
                statusFilter === 'active' 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              } text-xs font-semibold rounded-full whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors`}
              onClick={() => setStatusFilter('active')}
            >
              Active ({statusCounts.active || 0})
            </button>
            <button
              className={`px-3 py-1.5 ${
                statusFilter === 'follow-up' 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              } text-xs font-semibold rounded-full whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors`}
              onClick={() => setStatusFilter('follow-up')}
            >
              Needs Follow-up ({statusCounts['follow-up'] || 0})
            </button>
            <button
              className={`px-3 py-1.5 ${
                statusFilter === 'lead' 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              } text-xs font-semibold rounded-full whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors`}
              onClick={() => setStatusFilter('lead')}
            >
              Lead ({statusCounts.lead || 0})
            </button>
            <button
              className={`px-3 py-1.5 ${
                statusFilter === 'onboarded' 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              } text-xs font-semibold rounded-full whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors`}
              onClick={() => setStatusFilter('onboarded')}
            >
              Onboarded ({statusCounts.onboarded || 0})
            </button>
          </div>
        </div>
      </div>

      {/* 客户列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-background-light/50 dark:bg-background-dark/20">
        {paginatedCustomers.map((customer) => (
          <div
            key={customer.id}
            className={`group bg-white dark:bg-slate-800 p-4 rounded-xl border ${
              selectedCustomerId === customer.id
                ? 'border-2 border-primary shadow-md'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
            } cursor-pointer transition-all`}
            onClick={() => onSelectCustomer(customer.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{customer.name}</span>
              </div>
              <span className={`px-2 py-0.5 ${
                (customer.tracking?.status || customer.status) === 'Active' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : (customer.tracking?.status || customer.status) === 'Lead'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : (customer.tracking?.status || customer.status) === 'Follow-up'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              } text-[10px] font-bold rounded capitalize`}>
                {customer.tracking?.status || customer.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                {(customer.tracking?.next_action_icon || customer.nextActionIcon) === 'event' || (customer.tracking?.next_action_icon || customer.nextActionIcon) === 'calendar' ? (
                  <Calendar className={`text-sm ${(customer.tracking?.status || customer.status) === 'Follow-up' ? 'text-red-500' : 'text-slate-400'}`} size={16} />
                ) : (customer.tracking?.next_action_icon || customer.nextActionIcon) === 'schedule' || (customer.tracking?.next_action_icon || customer.nextActionIcon) === 'clock' ? (
                  <Clock className={`text-sm ${(customer.tracking?.status || customer.status) === 'Follow-up' ? 'text-red-500' : 'text-slate-400'}`} size={16} />
                ) : (customer.tracking?.next_action_icon || customer.nextActionIcon) === 'warning' || (customer.tracking?.next_action_icon || customer.nextActionIcon) === 'alert_triangle' ? (
                  <AlertTriangle className={`text-sm ${(customer.tracking?.status || customer.status) === 'Follow-up' ? 'text-red-500' : 'text-red-500'}`} size={16} />
                ) : (customer.tracking?.next_action_icon || customer.nextActionIcon) === 'check_circle' || (customer.tracking?.next_action_icon || customer.nextActionIcon) === 'check' ? (
                  <CheckCircle className={`text-sm ${(customer.tracking?.status || customer.status) === 'Follow-up' ? 'text-red-500' : 'text-slate-400'}`} size={16} />
                ) : (
                  <Calendar className={`text-sm ${(customer.tracking?.status || customer.status) === 'Follow-up' ? 'text-red-500' : 'text-slate-400'}`} size={16} />
                )}
                <span className={`text-xs font-medium ${
                  (customer.tracking?.status || customer.status) === 'Follow-up'
                    ? 'text-red-600 dark:text-red-400 italic font-bold'
                    : 'text-slate-600 dark:text-slate-400 italic'
                }`}>
                  {getNextActionDisplayText(customer)}
                </span>
              </div>
              
            </div>
          </div>
        ))}
      </div>

      {/* 分页控件 */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <button 
            className={`px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors ${
              !hasPrevPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            onClick={prevPage}
            disabled={!hasPrevPage}
          >
            Prev
          </button>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Page {currentPage} of {maxPage}
          </span>
          <button 
            className={`px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors ${
              !hasNextPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            onClick={nextPage}
            disabled={!hasNextPage}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerListSidebar;