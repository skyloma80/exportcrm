'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Customer as CustomerType, customerContactService } from '@/lib/pocketbase/services/customers';
import ActivityHistory from './ActivityHistory';
import { Edit3, Save, Mail, MessageSquare, Calendar as CalendarIcon, Bold, Italic, List, Link, History, User, Phone, MapPin, Plus } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';

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
  expand?: {
    customer_contacts_via_customer?: CustomerContact[];
  };
}

// 客户联系人类型 - 使用与服务中相同类型
import type { CustomerContact } from '@/lib/pocketbase/services/customers';

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

interface CustomerDetailPanelProps {
  customer: Customer | null;
  onSave: (updatedCustomer: Customer) => void;
}

const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({ customer, onSave }) => {
  const { user: currentUser } = useAuth();
  const [initialCustomer] = useState<Customer | null>(customer ? { ...customer } : null); // 保存初始状态用于比较
  const [editedCustomer, setEditedCustomer] = useState<Customer | null>(customer ? { ...customer } : null);
  const [notes, setNotes] = useState(customer?.notes || '');

  // 状态定义
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContact, setNewContact] = useState<Omit<CustomerContact, 'id' | 'created' | 'updated' | 'customer'>>({
    name: '',
    position: '',
    email: '',
    phone: '',
    wechat: '',
    is_primary: false
  });

  // 富文本编辑器引用
  const notesRef = useRef<HTMLDivElement>(null);

  // 富文本格式化函数
  const formatText = (command: string) => {
    if (notesRef.current) {
      notesRef.current.focus();
      document.execCommand(command, false);
    }
  };

  // 插入链接函数
  const insertLink = () => {
    if (notesRef.current) {
      const url = prompt('请输入链接地址:');
      if (url) {
        notesRef.current.focus();
        document.execCommand('createLink', false, url);
      }
    }
  };

  // 当customer prop发生变化时，更新内部状态和加载联系人
  useEffect(() => {
    if (customer) {
      // 合并客户基本信息和跟踪信息
      const mergedCustomer = {
        ...customer,
        // 如果有跟踪数据，则使用跟踪数据中的值
        priority: customer.tracking?.priority,
        contactStatus: customer.tracking?.contact_status,
        nextActionIcon: customer.tracking?.next_action_icon,
        nextActionText: customer.tracking?.next_action_text,
        nextStepAction: customer.tracking?.next_step_action,
        nextStepDate: customer.tracking?.next_step_date,
        notes: customer.tracking?.notes || '',
        status: customer.tracking?.status,
      };

      setEditedCustomer(mergedCustomer);
      setNotes(customer.tracking?.notes || '');

      // 加载客户联系人
      loadCustomerContacts(customer.id);
    } else {
      setEditedCustomer(null);
      setNotes('');
      setContacts([]);
    }
  }, [customer]);

  // 加载客户联系人
  const loadCustomerContacts = async (customerId: string) => {
    try {
      const customerContacts = await customerContactService.getByCustomer(customerId);
      setContacts(customerContacts);
    } catch (error) {
      console.error('Failed to load customer contacts:', error);
    }
  };

  // 添加新联系人
  const handleAddContact = async () => {
    if (!editedCustomer) return;

    try {
      const contactData = {
        name: newContact.name,
        position: newContact.position,
        email: newContact.email,
        phone: newContact.phone,
        wechat: newContact.wechat,
        is_primary: newContact.is_primary
      };

      const createdContact = await customerContactService.createContact(editedCustomer.id, contactData);
      
      // 更新联系人列表
      setContacts([createdContact, ...contacts]);
      
      // 重置表单
      setNewContact({
        name: '',
        position: '',
        email: '',
        phone: '',
        wechat: '',
        is_primary: false
      });
      
      setShowAddContactForm(false);
      
      console.log('Contact added successfully:', createdContact);
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };
  
  if (!customer) {
    return (
      <div className="hidden lg:flex flex-1 bg-background-light dark:bg-background-dark overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-3xl w-full mx-auto flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-center">
            Select a client to view details
          </p>
        </div>
      </div>
    );
  }

  // 处理表单变化
  const handleInputChange = (field: keyof Customer, value: any) => {
    if (editedCustomer) {
      let updatedCustomer;
      
      // 将field转换为字符串以避免类型错误
      const fieldStr = String(field);
      
      // 如果字段属于跟踪数据，则更新跟踪对象
      if (['status', 'priority', 'contactStatus', 'nextActionIcon', 'nextActionText', 'nextStepAction', 'nextStepDate', 'notes'].includes(fieldStr)) {
        updatedCustomer = {
          ...editedCustomer,
          tracking: {
            ...editedCustomer.tracking,
            customer_id: editedCustomer.id, // 确保customer_id始终存在
            status: editedCustomer.tracking?.status || editedCustomer.status || 'Lead',
            priority: editedCustomer.tracking?.priority || editedCustomer.priority || 'Medium',
            contact_status: editedCustomer.tracking?.contact_status || editedCustomer.contactStatus || 'Contacted',
            next_action_icon: editedCustomer.tracking?.next_action_icon || editedCustomer.nextActionIcon || 'calendar',
            next_action_text: editedCustomer.tracking?.next_action_text || editedCustomer.nextActionText || '',
            next_step_action: editedCustomer.tracking?.next_step_action || editedCustomer.nextStepAction || '',
            next_step_date: editedCustomer.tracking?.next_step_date || editedCustomer.nextStepDate || new Date().toISOString().split('T')[0],
            notes: editedCustomer.tracking?.notes || editedCustomer.notes || '',
            [fieldStr === 'status' ? 'status' : 
             fieldStr === 'priority' ? 'priority' : 
             fieldStr === 'contactStatus' ? 'contact_status' : 
             fieldStr === 'nextActionIcon' ? 'next_action_icon' : 
             fieldStr === 'nextActionText' ? 'next_action_text' : 
             fieldStr === 'nextStepAction' ? 'next_step_action' : 
             fieldStr === 'nextStepDate' ? 'next_step_date' : 
             fieldStr === 'notes' ? 'notes' : fieldStr]: value
          },
          [field]: value  // 同时更新顶层属性以保持兼容性
        };
      } else {
        // 如果是基本客户字段，则直接更新
        updatedCustomer = {
          ...editedCustomer,
          [field]: value
        };
      }
      
      setEditedCustomer(updatedCustomer);
      
      // 如果是notes字段，也要同步到状态
      if (field === 'notes') {
        setNotes(value);
      }
    }
  };

  // 保存更改
  const handleSave = () => {
    if (editedCustomer) {
      // 创建活动历史记录，记录变更详情 - 记录用户修改的字段
      const changes = [];
      if (editedCustomer.tracking?.status !== initialCustomer?.tracking?.status) {
        changes.push(`set status to ${editedCustomer.tracking?.status || 'unknown'}`);
      }
      if (editedCustomer.tracking?.priority !== initialCustomer?.tracking?.priority) {
        changes.push(`set priority to ${editedCustomer.tracking?.priority || 'unknown'}`);
      }
      if (editedCustomer.tracking?.contact_status !== initialCustomer?.tracking?.contact_status) {
        changes.push(`set contact status to ${editedCustomer.tracking?.contact_status || 'unknown'}`);
      }
      if (editedCustomer.tracking?.next_action_text !== initialCustomer?.tracking?.next_action_text) {
        changes.push(`set next action text to "${editedCustomer.tracking?.next_action_text || 'unknown'}"`);
      }
      if (editedCustomer.tracking?.next_action_icon !== initialCustomer?.tracking?.next_action_icon) {
        changes.push(`set next action icon to ${editedCustomer.tracking?.next_action_icon || 'unknown'}`);
      }
      if (editedCustomer.tracking?.next_step_action !== initialCustomer?.tracking?.next_step_action) {
        changes.push(`set next step action to ${editedCustomer.tracking?.next_step_action || 'unknown'}`);
      }
      if (editedCustomer.tracking?.next_step_date !== initialCustomer?.tracking?.next_step_date) {
        // 格式化日期为更友好的格式
        const formatDate = (dateStr: string | undefined) => {
          if (!dateStr) return 'unknown';
          try {
            // 如果是ISO字符串，转换为更易读的格式
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr; // 如果不是有效日期，返回原字符串
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          } catch (e) {
            return dateStr; // 发生错误时返回原字符串
          }
        };

        changes.push(`set next step date to ${formatDate(editedCustomer.tracking?.next_step_date)}`);
      }
      if (editedCustomer.tracking?.notes !== initialCustomer?.tracking?.notes) {
        // 清理HTML标签，只显示纯文本内容
        const cleanNotes = editedCustomer.tracking?.notes 
          ? editedCustomer.tracking.notes.replace(/<[^>]*>/g, '').substring(0, 50) + (editedCustomer.tracking.notes.replace(/<[^>]*>/g, '').length > 50 ? '...' : '')
          : 'unknown';
        changes.push(`updated outreach notes to "${cleanNotes}"`);
      }

      const activityDescription = changes.length > 0
        ? changes.join(', ')
        : 'made changes to customer tracking';

      // 构建更新后的客户对象，包含跟踪信息（应用默认值）
      const updatedCustomer = {
        ...editedCustomer,
        tracking: {
          ...editedCustomer.tracking,
          customer_id: editedCustomer.id, // 确保customer_id始终存在
          priority: editedCustomer.tracking?.priority ?? editedCustomer.priority ?? 'Medium',
          contact_status: editedCustomer.tracking?.contact_status ?? editedCustomer.contactStatus ?? 'Contacted',
          next_action_icon: editedCustomer.tracking?.next_action_icon ?? editedCustomer.nextActionIcon ?? 'calendar',
          next_action_text: editedCustomer.tracking?.next_action_text ?? editedCustomer.nextActionText ?? '',
          next_step_action: editedCustomer.tracking?.next_step_action ?? editedCustomer.nextStepAction ?? '',
          next_step_date: editedCustomer.tracking?.next_step_date ?? editedCustomer.nextStepDate ?? new Date().toISOString().split('T')[0],
          notes: editedCustomer.tracking?.notes ?? editedCustomer.notes ?? notes,
          status: editedCustomer.tracking?.status ?? editedCustomer.status ?? 'Lead',
        }
      };
      
      // 在保存客户信息的同时，添加活动历史记录
      const now = new Date();
      // 格式化时间为 "Today • HH:MM" 或具体日期 "Feb DD, YYYY • HH:MM"
      const today = new Date();
      const isToday = now.toDateString() === today.toDateString();
      
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const dateString = isToday 
        ? 'Today' 
        : now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      const timestamp = `${dateString} • ${timeString}`;
      
      onSave({
        ...updatedCustomer,
        activities: [
          {
            id: `temp-${Date.now()}`, // 临时ID，实际保存时会被替换
            user: currentUser?.name || currentUser?.email || 'Unknown User',
            description: activityDescription,
            timestamp: timestamp, // 使用更友好的时间戳格式
            isRecent: true
          },
          ...(updatedCustomer.activities || []) // 保留现有的活动历史
        ]
      });
    }
  };

  return (
    <div className="hidden lg:flex flex-1 bg-background-light dark:bg-background-dark overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-3xl w-full mx-auto pb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-widest">
              <Edit3 size={16} />
              Client Profile
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{customer.name}</h2>
          </div>
          <div className="flex gap-2">
            <button 
              className="px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 hover:bg-primary/90 transition-all flex items-center gap-2"
              onClick={handleSave}
            >
              <Save size={20} />
              Save Changes
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">Contact Information</h3>
            <button 
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              onClick={() => setShowAddContactForm(!showAddContactForm)}
            >
              <Plus size={14} />
              {showAddContactForm ? 'Cancel' : 'Add Contact'}
            </button>
          </div>

          {/* 添加联系人表单 */}
          {showAddContactForm && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-black tracking-wide mb-1">Name *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-black dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    value={newContact.name}
                    onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black tracking-wide mb-1">Position</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-black dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    value={newContact.position}
                    onChange={(e) => setNewContact({...newContact, position: e.target.value})}
                    placeholder="Position"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black tracking-wide mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-black dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                    placeholder="Email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black tracking-wide mb-1">Phone</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-black dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                    placeholder="Phone"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black tracking-wide mb-1">WeChat</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-black dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    value={newContact.wechat}
                    onChange={(e) => setNewContact({...newContact, wechat: e.target.value})}
                    placeholder="WeChat"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="is_primary"
                    className="h-4 w-4 text-primary rounded border-primary focus:ring-offset-0 focus:ring-0"
                    checked={newContact.is_primary}
                    onChange={(e) => setNewContact({...newContact, is_primary: e.target.checked})}
                  />
                  <label htmlFor="is_primary" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                    Set as primary contact
                  </label>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 hover:bg-primary/90 transition-all"
                  onClick={handleAddContact}
                >
                  Add Contact
                </button>
              </div>
            </div>
          )}

          {/* 显示联系人列表 */}
          <div className="space-y-4">
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <div key={contact.id} className="flex items-start gap-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold border-2 border-white dark:border-slate-800">
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{contact.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{contact.position || 'Position not specified'}</p>
                      </div>
                      {contact.is_primary && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {contact.email && (
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <Mail size={12} />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <Phone size={12} />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.wechat && (
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <MessageSquare size={12} />
                          <span>{contact.wechat}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                <p>No contacts found for this customer</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
          <form className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-black tracking-wide">Priority Level</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map((level) => (
                    <label 
                      key={level}
                      className={`inline-flex items-center px-4 py-2 rounded-lg border-2 ${
                        editedCustomer?.priority === level
                          ? 'border-primary bg-primary/5 text-primary cursor-pointer hover:bg-primary/10'
                          : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-slate-400 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'
                      } transition-colors`}
                      onClick={() => handleInputChange('priority', level)}
                    >
                      <input 
                        type="radio" 
                        name="priority" 
                        className="form-checkbox h-4 w-4 text-primary rounded border-primary focus:ring-offset-0 focus:ring-0" 
                        checked={editedCustomer?.priority === level}
                        readOnly
                      />
                      <span className="ml-2 text-xs font-bold">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-black tracking-wide">Contact Status</label>
                <div className="flex gap-2">
                  {['Contacted', 'Replied', 'No Reply'].map((status) => (
                    <label 
                      key={status}
                      className={`inline-flex items-center px-4 py-2 rounded-lg border-2 ${
                        editedCustomer?.contactStatus === status
                          ? 'border-primary bg-primary/5 text-primary cursor-pointer hover:bg-primary/10'
                          : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-slate-400 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'
                      } transition-colors`}
                      onClick={() => handleInputChange('contactStatus', status)}
                    >
                      <input 
                        type="radio" 
                        name="status" 
                        className="form-checkbox h-4 w-4 text-primary rounded border-primary focus:ring-offset-0 focus:ring-0" 
                        checked={editedCustomer?.contactStatus === status}
                        readOnly
                      />
                      <span className="ml-2 text-xs font-bold">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-black tracking-wide">Customer Status</label>
              <div className="flex gap-2">
                {['Active', 'Lead', 'Follow-up', 'Onboarded'].map((status) => (
                  <label 
                    key={status}
                    className={`inline-flex items-center px-4 py-2 rounded-lg border-2 ${
                      editedCustomer?.status === status
                        ? 'border-primary bg-primary/5 text-primary cursor-pointer hover:bg-primary/10'
                        : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-slate-400 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'
                    } transition-colors`}
                    onClick={() => handleInputChange('status', status as 'Active' | 'Lead' | 'Follow-up' | 'Onboarded')}
                  >
                    <input 
                      type="radio" 
                      name="customer-status" 
                      className="form-checkbox h-4 w-4 text-primary rounded border-primary focus:ring-offset-0 focus:ring-0" 
                      checked={editedCustomer?.status === status}
                      readOnly
                    />
                    <span className="ml-2 text-xs font-bold">{status}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-black tracking-wide">Outreach Notes</label>
              </div>
              <div className="relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <button 
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" 
                    type="button"
                    onClick={() => formatText('bold')}
                    title="Bold"
                  >
                    <Bold size={16} />
                  </button>
                  <button 
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" 
                    type="button"
                    onClick={() => formatText('italic')}
                    title="Italic"
                  >
                    <Italic size={16} />
                  </button>
                  <button 
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" 
                    type="button"
                    onClick={() => formatText('insertUnorderedList')}
                    title="Bullet List"
                  >
                    <List size={16} />
                  </button>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                  <button 
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" 
                    type="button"
                    onClick={insertLink}
                    title="Insert Link"
                  >
                    <Link size={16} />
                  </button>
                </div>
                <div
                  ref={notesRef}
                  contentEditable
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 text-black border-none focus:ring-0 outline-none resize-none font-medium min-h-[120px]"
                  onInput={(e) => {
                    const content = e.currentTarget.innerHTML;
                    setNotes(content);
                    handleInputChange('notes', content);
                  }}
                  dangerouslySetInnerHTML={{ __html: notes }}
                />
                {notes === '' && (
                  <div className="absolute inset-0 px-4 py-3 pointer-events-none text-slate-400 font-medium flex items-center">
                    Enter details about the latest interaction...
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-black tracking-wide">Next Step Action</label>
              <div className="flex gap-3">
                {['Follow-up', 'Call', 'Meeting', 'Quote'].map((action) => (
                  <label 
                    key={action}
                    className={`inline-flex items-center px-4 py-2 rounded-lg border-2 ${
                      editedCustomer?.nextStepAction === action
                        ? 'border-primary bg-primary/5 text-primary cursor-pointer hover:bg-primary/10'
                        : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-slate-400 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'
                    } transition-colors`}
                    onClick={() => {
                      handleInputChange('nextStepAction', action);
                    }}
                  >
                    <input 
                      type="radio" 
                      name="nextStepAction"
                      className="form-radio h-4 w-4 text-primary rounded-full border-primary focus:ring-0 focus:ring-offset-0" 
                      checked={editedCustomer?.nextStepAction === action}
                      readOnly
                    />
                    <span className="ml-2 text-xs font-bold">{action}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-black tracking-wide">Next Step Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !editedCustomer?.nextStepDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editedCustomer?.nextStepDate 
                        ? format(new Date(editedCustomer.nextStepDate), 'yyyy-MM-dd') 
                        : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editedCustomer?.nextStepDate ? new Date(editedCustomer.nextStepDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // 使用年月日构造日期字符串，避免时区转换问题
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，需要+1
                          const day = String(date.getDate()).padStart(2, '0');
                          handleInputChange('nextStepDate', `${year}-${month}-${day}`);
                        } else {
                          handleInputChange('nextStepDate', '');
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </form>
        </div>
        
        <ActivityHistory 
          customer={customer} 
        />
      </div>
    </div>
  );
};

export default CustomerDetailPanel;