'use client';

import React, { useState, useEffect } from 'react';
import { Customer } from '../types/customer';
import ActivityHistory from './ActivityHistory';
import { Edit3, Save, Mail, MessageSquare, Calendar, Bold, Italic, List, Link, History, User, Phone, MapPin } from 'lucide-react';

interface CustomerDetailPanelProps {
  customer: Customer | null;
  onSave: (updatedCustomer: Customer) => void;
}

const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({ customer, onSave }) => {
  const [editedCustomer, setEditedCustomer] = useState<Customer | null>(customer ? { ...customer } : null);
  const [notes, setNotes] = useState(customer?.notes || '');

  // 当customer prop发生变化时，更新内部状态
  useEffect(() => {
    if (customer) {
      setEditedCustomer({ ...customer });
      setNotes(customer.notes || '');
    } else {
      setEditedCustomer(null);
      setNotes('');
    }
  }, [customer]);
  
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
      setEditedCustomer({
        ...editedCustomer,
        [field]: value
      });
      
      // 如果是notes字段，也要同步到状态
      if (field === 'notes') {
        setNotes(value);
      }
    }
  };

  // 保存更改
  const handleSave = () => {
    if (editedCustomer) {
      const customerWithUpdatedNotes = {
        ...editedCustomer,
        notes: notes
      };
      onSave(customerWithUpdatedNotes);
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Contact Information</h3>
            <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">+ Add Contact</button>
          </div>
          
          <div className="flex items-start gap-4">
            <img 
              className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 object-cover" 
              src={customer.contactAvatar || "https://placehold.co/48x48"} 
              alt={`${customer.contactName}'s portrait`} 
            />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{customer.contactName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{customer.contactTitle || 'Title not specified'}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <Mail size={16} className="text-slate-400" />
                  <span>{customer.contactEmail || 'Email not specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <MessageSquare size={16} className="text-slate-400" />
                  <span>{customer.contactWeChat || 'WeChat not specified'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
          <form className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-black uppercase tracking-wide">Priority Level</label>
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
                <label className="text-xs font-bold text-black uppercase tracking-wide">Contact Status</label>
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
              <label className="text-xs font-bold text-black uppercase tracking-wide">Customer Status</label>
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
                <label className="text-xs font-bold text-black uppercase tracking-wide">Outreach Notes</label>
                <span className="text-[10px] text-black font-medium">Auto-saved at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" type="button">
                    <Bold size={16} />
                  </button>
                  <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" type="button">
                    <Italic size={16} />
                  </button>
                  <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" type="button">
                    <List size={16} />
                  </button>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                  <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" type="button">
                    <Link size={16} />
                  </button>
                </div>
                <textarea
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 text-black border-none focus:ring-0 outline-none resize-none placeholder-slate-400 font-medium"
                  placeholder="Enter details about the latest interaction..."
                  rows={6}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    handleInputChange('notes', e.target.value);
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-black uppercase tracking-wide">Next Step Action</label>
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
                      if (editedCustomer) {
                        setEditedCustomer({
                          ...editedCustomer,
                          nextStepAction: action
                        });
                      }
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
                <label className="text-xs font-bold text-black uppercase tracking-wide">Next Step Date</label>
                <div>
                  <input
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-black font-medium focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    type="date"
                    value={editedCustomer?.nextStepDate || ''}
                    onChange={(e) => handleInputChange('nextStepDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <ActivityHistory 
          customer={customer} 
          onAddActivity={(newActivity) => {
            if (editedCustomer) {
              const updatedActivities = [
                {
                  ...newActivity,
                  id: `act_${Date.now()}` // 简单生成ID，实际应用中应使用更可靠的ID生成方法
                },
                ...(editedCustomer.activities || [])
              ];
              
              setEditedCustomer({
                ...editedCustomer,
                activities: updatedActivities
              });
            }
          }} 
        />
      </div>
    </div>
  );
};

export default CustomerDetailPanel;