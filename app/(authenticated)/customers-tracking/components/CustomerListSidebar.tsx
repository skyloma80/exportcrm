'use client';

import React from 'react';
import { Customer } from '../types/customer';
import { useSearchAndFilter } from '../hooks/useSearchAndFilter';
import { usePagination } from '../hooks/usePagination';
import { Search, Filter, User, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

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
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Contact: {customer.contactName}
                </span>
              </div>
              <span className={`px-2 py-0.5 ${
                customer.status === 'Active' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : customer.status === 'Lead'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : customer.status === 'Follow-up'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              } text-[10px] font-bold rounded uppercase`}>
                {customer.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                {customer.nextActionIcon === 'event' || customer.nextActionIcon === 'calendar' ? (
                  <Calendar className={`text-sm ${customer.status === 'Follow-up' ? 'text-red-500' : 'text-slate-400'}`} size={16} />
                ) : customer.nextActionIcon === 'schedule' || customer.nextActionIcon === 'clock' ? (
                  <Clock className={`text-sm ${customer.status === 'Follow-up' ? 'text-red-500' : 'text-slate-400'}`} size={16} />
                ) : customer.nextActionIcon === 'warning' || customer.nextActionIcon === 'alert_triangle' ? (
                  <AlertTriangle className={`text-sm ${customer.status === 'Follow-up' ? 'text-red-500' : 'text-red-500'}`} size={16} />
                ) : customer.nextActionIcon === 'check_circle' || customer.nextActionIcon === 'check' ? (
                  <CheckCircle className={`text-sm ${customer.status === 'Follow-up' ? 'text-red-500' : 'text-slate-400'}`} size={16} />
                ) : (
                  <Calendar className={`text-sm ${customer.status === 'Follow-up' ? 'text-red-500' : 'text-slate-400'}`} size={16} />
                )}
                <span className={`text-xs font-medium ${
                  customer.status === 'Follow-up' 
                    ? 'text-red-600 dark:text-red-400 italic font-bold' 
                    : 'text-slate-600 dark:text-slate-400 italic'
                }`}>
                  {customer.nextActionText}
                </span>
              </div>
              
              <div className="flex -space-x-2">
                {customer.teamMembers?.slice(0, 3).map((member, index) => (
                  <div key={index} className="relative">
                    {member.avatar ? (
                      <img
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800"
                        src={member.avatar}
                        alt={`Avatar of ${member.name}`}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-800">
                        {member.initials || member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}
                
                {customer.teamMembers && customer.teamMembers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-800">
                    +{customer.teamMembers.length - 3}
                  </div>
                )}
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