// hooks/useCustomerStatus.ts
import { useState } from 'react';
import { Customer } from '../types/customer';

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
    return customers.filter(customer => customer.status.toLowerCase() === status.toLowerCase());
  };

  return {
    selectedStatus,
    setSelectedStatus,
    updateCustomerStatus,
    filterByStatus
  };
};