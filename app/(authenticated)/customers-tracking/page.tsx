// app/(authenticated)/customers-tracking/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Customer } from './types/customer';
import { getCustomers } from './services/customerService';
import CustomerListSidebar from './components/CustomerListSidebar';
import CustomerDetailPanel from './components/CustomerDetailPanel';
import { Loader2 } from 'lucide-react';

const CustomersTrackingPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getCustomers();
        setCustomers(data);
        if (data.length > 0) {
          setSelectedCustomer(data[0]); // 默认选择第一个客户
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleSelectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
    }
  };

  const handleSaveCustomer = async (updatedCustomer: Customer) => {
    try {
      // 在实际应用中，这里会调用API更新客户信息
      // await updateCustomer(updatedCustomer);
      
      // 更新本地状态
      setCustomers(prev => 
        prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)
      );
      
      // 如果更新的是当前选中的客户，也更新选中状态
      if (selectedCustomer && selectedCustomer.id === updatedCustomer.id) {
        setSelectedCustomer(updatedCustomer);
      }
      
      console.log('Customer updated successfully:', updatedCustomer);
    } catch (error) {
      console.error('Failed to update customer:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased">
      <CustomerListSidebar
        customers={customers}
        selectedCustomerId={selectedCustomer?.id || null}
        onSelectCustomer={handleSelectCustomer}
      />
      <CustomerDetailPanel
        customer={selectedCustomer}
        onSave={handleSaveCustomer}
      />
    </div>
  );
};

export default CustomersTrackingPage;