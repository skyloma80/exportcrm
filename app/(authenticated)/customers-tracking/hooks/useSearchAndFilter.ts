// hooks/useSearchAndFilter.ts
import { useState, useMemo } from 'react';
import { Customer } from '../types/customer';

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
        customer.contactName.toLowerCase().includes(searchTerm.toLowerCase());

      // 检查状态筛选
      const matchesStatus = statusFilter === 'all' || 
        customer.status.toLowerCase() === statusFilter.toLowerCase();

      // 检查优先级筛选
      const matchesPriority = priorityFilter === 'all' || 
        (customer.priority && customer.priority.toLowerCase() === priorityFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [customers, searchTerm, statusFilter, priorityFilter]);

  const getStatusCounts = () => {
    return customers.reduce((acc, customer) => {
      const status = customer.status.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const getPriorityCounts = () => {
    return customers.reduce((acc, customer) => {
      if (customer.priority) {
        const priority = customer.priority.toLowerCase();
        acc[priority] = (acc[priority] || 0) + 1;
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