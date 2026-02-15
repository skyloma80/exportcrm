// app/(authenticated)/customers-tracking/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Customer } from '@/lib/pocketbase/services/customers';
import { getCustomersWithTracking, updateCustomerTracking, createCustomerActivity } from './services/customerTrackingService';
import CustomerListSidebar from './components/CustomerListSidebar';
import CustomerDetailPanel from './components/CustomerDetailPanel';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const CustomersTrackingPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getCustomersWithTracking();
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
      // 分离客户基本信息和跟踪信息
      const { 
        tracking, 
        activities,
        id,
        name,
        name_cn,
        country,
        type,
        rating,
        preferred_currency,
        address,
        address_cn,
        website,
        remarks,
        tax_id,
        code,
        created,
        updated,
        expand,
        ...basicCustomerFields
      } = updatedCustomer;

      // 更新客户基本信息（如果需要的话）
      // 注意：通常客户基本信息不会在此处更新，而是通过专门的客户管理页面
      
      // 更新跟踪信息
      if (tracking) {
        const trackingData = {
          status: tracking.status,
          priority: tracking.priority,
          contact_status: tracking.contact_status,
          next_action_icon: tracking.next_action_icon,
          next_action_text: tracking.next_action_text,
          next_step_action: tracking.next_step_action,
          next_step_date: tracking.next_step_date,
          notes: tracking.notes,
        };
        
        await updateCustomerTracking(id, trackingData);
      }
      
      // 创建活动历史记录
      if (activities && activities.length > 0) {
        // 添加最近的活动记录到数据库
        await createCustomerActivity(id, {
          user: currentUser?.name || currentUser?.email || 'Unknown User',
          description: activities[0].description,
          timestamp: new Date().toISOString(),
          is_recent: true,
        });
      }
      
      // 重新获取更新后的客户数据
      const updatedCustomers = await getCustomersWithTracking();
      setCustomers(updatedCustomers);
      
      // 找到更新后的客户并设置为选中状态
      const updatedSelectedCustomer = updatedCustomers.find(c => c.id === id);
      if (updatedSelectedCustomer) {
        setSelectedCustomer(updatedSelectedCustomer);
      }
      
      console.log('Customer tracking updated successfully:', updatedCustomer);
    } catch (error) {
      console.error('Failed to update customer tracking:', error);
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