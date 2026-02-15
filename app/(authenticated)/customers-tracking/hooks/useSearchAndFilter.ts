// hooks/useSearchAndFilter.ts
import { useState, useMemo } from 'react';
import { Customer as CustomerType } from '@/lib/pocketbase/services/customers';

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

interface UseSearchAndFilterProps {
  customers: Customer[];
}

export const useSearchAndFilter = ({ customers }: UseSearchAndFilterProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // 检查搜索条件
      const matchesSearch = searchTerm === '' ||
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.contactName || '').toLowerCase().includes(searchTerm.toLowerCase());

      // 检查状态筛选 - 优先使用跟踪状态，否则使用客户基本状态
      const customerStatus = customer.tracking?.status || customer.status;
      const matchesStatus = statusFilter === 'all' ||
        (customerStatus && customerStatus.toLowerCase() === statusFilter.toLowerCase());

      // 检查优先级筛选 - 优先使用跟踪优先级，否则使用客户基本优先级
      const customerPriority = customer.tracking?.priority || customer.priority;
      const matchesPriority = priorityFilter === 'all' ||
        (customerPriority && customerPriority.toLowerCase() === priorityFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [customers, searchTerm, statusFilter, priorityFilter]);

  const getStatusCounts = () => {
    return customers.reduce((acc, customer) => {
      // 优先使用跟踪状态，否则使用客户基本状态
      const status = (customer.tracking?.status || customer.status)?.toLowerCase() || '';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const getPriorityCounts = () => {
    return customers.reduce((acc, customer) => {
      // 优先使用跟踪优先级，否则使用客户基本优先级
      const priority = customer.tracking?.priority || customer.priority;
      if (priority) {
        const priorityLower = priority.toLowerCase();
        acc[priorityLower] = (acc[priorityLower] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  };

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    filteredCustomers,
    statusCounts: getStatusCounts(),
    priorityCounts: getPriorityCounts()
  };
};