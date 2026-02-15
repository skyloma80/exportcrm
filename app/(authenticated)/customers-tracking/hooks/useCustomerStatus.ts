// hooks/useCustomerStatus.ts
import { useState } from 'react';
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

export const useCustomerStatus = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const updateCustomerStatus = (customer: Customer, newStatus: Customer['status']): Customer => {
    return {
      ...customer,
      status: newStatus
    };
  };

  const filterByStatus = (customers: Customer[], status: string): Customer[] => {
    if (status === 'all') {
      return customers;
    }
    return customers.filter(customer => {
      const customerStatus = customer.tracking?.status || customer.status;
      return customerStatus && customerStatus.toLowerCase() === status.toLowerCase();
    });
  };

  return {
    selectedStatus,
    setSelectedStatus,
    updateCustomerStatus,
    filterByStatus
  };
};