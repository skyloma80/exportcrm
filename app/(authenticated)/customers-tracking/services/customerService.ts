// services/customerService.ts
import { Customer } from '../types/customer';

// 模拟客户数据
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Global Logistics Corp',
    contactName: 'Marcus Webb',
    contactTitle: 'Logistics Director',
    contactEmail: 'marcus.webb@globallogistics.com',
    contactWeChat: 'mwebb_glc',
    contactAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGfHoiMPsh4aSG8YyG5Zu37yaQdYbJp52RVCml9G3TC-9OG2dseexViUXDAC4_shagpfTRv_DHVjT5QKJjE3oRjzElEEKK_YgLnd0jgOTBfi-ojVw4Ku_vojuv1InoD3pGXSfbL_IRvXeQ4A3URcFkaBNlim-k77jM2BZum06OV2h871p2tYyJ1Gu7hTfBxxcc2esN8WC6Gbza71pUrdL1fKzJB41h97jAFye2Y8l_cik_kTH_eh77kdLNA_9udMvvqage0TsLL_yp',
    status: 'Active',
    priority: 'Medium',
    contactStatus: 'Contacted',
    nextActionIcon: 'calendar',
    nextActionText: 'Tomorrow, 10:00 AM',
    nextStepAction: 'Follow-up',
    nextStepDate: '2023-10-24',
    notes: 'Had a discovery call with Marcus today. They are expanding their European logistics hub and looking for a better tracking solution. Budget is approved for Q4. Scheduled a demo for tomorrow morning.',
    teamMembers: [
      {
        id: 'tm1',
        name: 'Team Member 1',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGfHoiMPsh4aSG8YyG5Zu37yaQdYbJp52RVCml9G3TC-9OG2dseexViUXDAC4_shagpfTRv_DHVjT5QKJjE3oRjzElEEKK_YgLnd0jgOTBfi-ojVw4Ku_vojuv1InoD3pGXSfbL_IRvXeQ4A3URcFkaBNlim-k77jM2BZum06OV2h871p2tYyJ1Gu7hTfBxxcc2esN8WC6Gbza71pUrdL1fKzJB41h97jAFye2Y8l_cik_kTH_eh77kdLNA_9udMvvqage0TsLL_yp'
      },
      {
        id: 'tm2',
        name: 'Team Member 2',
        initials: 'TM'
      },
      {
        id: 'tm3',
        name: 'Team Member 3',
        initials: 'TM'
      }
    ],
    activities: [
      {
        id: 'act1',
        user: 'Alex Rivera',
        description: 'moved status from Lead to Active',
        timestamp: 'Today • 2:32 PM',
        isRecent: true
      },
      {
        id: 'act2',
        user: '',
        description: 'New note added: "Spoke with CFO regarding budgetary constraints..."',
        timestamp: 'Oct 20, 2023 • 10:15 AM'
      },
      {
        id: 'act3',
        user: '',
        description: 'Client record created',
        timestamp: 'Oct 18, 2023 • 9:00 AM'
      }
    ]
  },
  {
    id: '2',
    name: 'Stellar Marketing Inc.',
    contactName: 'Sarah Jenkins',
    contactTitle: 'Marketing Manager',
    contactEmail: 'sarah.jenkins@stellar.com',
    contactWeChat: 'sj_stellar',
    contactAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA13YZFfFLdK0IjkLCvfDoMGSTf56x2oRkEX3f7VfrX10_RiGqTrtMWnRUoVU04tF7Ufx8T9Saq6h0eptvl0jn7a4oQZO6ogG-SNq4YGhMnCRtJoAHSTi80AK7PtEpC2KM3w_LUjmanupem6eCSQkFQDR49Ez8mgtIv97nCZEyKcijMiu-GTjACgV4wogmuKhRmU_L4AIoXfnPUPrkSvUYB9jeS6_rygP5uWL8gdmB0wB4qt5xrw0_oTS9QhWy9aFbElOYSn0alaU5-',
    status: 'Lead',
    priority: 'High',
    contactStatus: 'Replied',
    nextActionIcon: 'clock',
    nextActionText: 'Today, 4:30 PM',
    nextStepAction: 'Call',
    nextStepDate: '2023-10-23',
    notes: 'Initial contact made. Interested in our marketing solutions. Need to schedule a demo next week.',
    teamMembers: [
      {
        id: 'tm4',
        name: 'Sarah Jenkins',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA13YZFfFLdK0IjkLCvfDoMGSTf56x2oRkEX3f7VfrX10_RiGqTrtMWnRUoVU04tF7Ufx8T9Saq6h0eptvl0jn7a4oQZO6ogG-SNq4YGhMnCRtJoAHSTi80AK7PtEpC2KM3w_LUjmanupem6eCSQkFQDR49Ez8mgtIv97nCZEyKcijMiu-GTjACgV4wogmuKhRmU_L4AIoXfnPUPrkSvUYB9jeS6_rygP5uWL8gdmB0wB4qt5xrw0_oTS9QhWy9aFbElOYSn0alaU5-'
      }
    ],
    activities: [
      {
        id: 'act4',
        user: 'Jane Smith',
        description: 'added initial contact information',
        timestamp: 'Yesterday • 11:00 AM'
      }
    ]
  },
  {
    id: '3',
    name: 'Quantum Tech Sol.',
    contactName: 'David Chen',
    contactTitle: 'CTO',
    contactEmail: 'david.chen@quantumtech.com',
    contactWeChat: 'dc_quantum',
    status: 'Follow-up',
    priority: 'High',
    contactStatus: 'No Reply',
    nextActionIcon: 'alert_triangle',
    nextActionText: 'Overdue (2 days)',
    nextStepAction: 'Call',
    nextStepDate: '2023-10-21',
    notes: 'Sent proposal last week. Following up on decision timeline.',
    teamMembers: [
      {
        id: 'tm5',
        name: 'David Chen',
        initials: 'DC'
      }
    ],
    activities: [
      {
        id: 'act5',
        user: 'Michael Brown',
        description: 'sent proposal document',
        timestamp: 'Oct 20, 2023 • 3:00 PM'
      }
    ]
  },
  {
    id: '4',
    name: 'Apex Retail Partners',
    contactName: 'Elena Rodriguez',
    contactTitle: 'Operations Head',
    contactEmail: 'elena.rodriguez@apexretail.com',
    contactWeChat: 'er_apex',
    contactAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAd6STAB-LNtXuU68_d-V5J4hngdQ-7YthSfqdiSu8mxIi_9Lyr04HFCEaw-kc_aSWaQfhXFzh9Yee5-J8hpwAp2FkIJ70AQDeOxyjvYjV8EJJkKU4ydBR-dHwMHCoAoxJNwcyOPjHT7ubwYYxrc3Ev_zXbZKJ9_jtd-F5u0LQHoR6uG8Wi1xcfGfM8JxYzM1wgoq2kFDLaCetsjM-meG-QEy7WdrtxMnDdfFutGPr3_JvZFdXwqcViArLz261yHX2sqVUo7NVAmqnn',
    status: 'Onboarded',
    priority: 'Low',
    contactStatus: 'Contacted',
    nextActionIcon: 'check',
    nextActionText: 'Project Started',
    nextStepAction: 'Meeting',
    nextStepDate: '2023-10-15',
    notes: 'Successfully onboarded. Project is running smoothly.',
    teamMembers: [
      {
        id: 'tm6',
        name: 'Team Member 6',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAd6STAB-LNtXuU68_d-V5J4hngdQ-7YthSfqdiSu8mxIi_9Lyr04HFCEaw-kc_aSWaQfhXFzh9Yee5-J8hpwAp2FkIJ70AQDeOxyjvYjV8EJJkKU4ydBR-dHwMHCoAoxJNwcyOPjHT7ubwYYxrc3Ev_zXbZKJ9_jtd-F5u0LQHoR6uG8Wi1xcfGfM8JxYzM1wgoq2kFDLaCetsjM-meG-QEy7WdrtxMnDdfFutGPr3_JvZFdXwqcViArLz261yHX2sqVUo7NVAmqnn'
      }
    ],
    activities: [
      {
        id: 'act6',
        user: 'Robert Johnson',
        description: 'marked as onboarded',
        timestamp: 'Oct 15, 2023 • 10:00 AM'
      }
    ]
  },
  {
    id: '5',
    name: 'Horizon Web Media',
    contactName: 'Mike Thompson',
    contactTitle: 'Digital Director',
    contactEmail: 'mike.thompson@horizonweb.com',
    contactWeChat: 'mt_horizon',
    status: 'Active',
    priority: 'Medium',
    contactStatus: 'Contacted',
    nextActionIcon: 'calendar',
    nextActionText: 'Oct 24, 2:00 PM',
    nextStepAction: 'Meeting',
    nextStepDate: '2023-10-24',
    notes: 'Scheduled meeting to discuss new website redesign project.',
    teamMembers: [
      {
        id: 'tm7',
        name: 'Mike Thompson',
        initials: 'MT'
      }
    ],
    activities: [
      {
        id: 'act7',
        user: 'Lisa Wang',
        description: 'scheduled meeting for Oct 24',
        timestamp: 'Oct 22, 2023 • 2:15 PM'
      }
    ]
  }
];

/**
 * 获取所有客户
 */
export const getCustomers = async (): Promise<Customer[]> => {
  // 模拟异步请求延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  return Promise.resolve([...mockCustomers]);
};

/**
 * 根据ID获取特定客户
 */
export const getCustomerById = async (id: string): Promise<Customer | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockCustomers.find(customer => customer.id === id);
};

/**
 * 更新客户信息
 */
export const updateCustomer = async (updatedCustomer: Customer): Promise<Customer> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const index = mockCustomers.findIndex(customer => customer.id === updatedCustomer.id);
  if (index !== -1) {
    mockCustomers[index] = { ...updatedCustomer };
    return Promise.resolve({ ...updatedCustomer });
  }
  
  throw new Error(`Customer with id ${updatedCustomer.id} not found`);
};

/**
 * 创建新客户
 */
export const createCustomer = async (newCustomer: Omit<Customer, 'id'>): Promise<Customer> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const id = `cust_${Date.now()}`;
  const customer: Customer = {
    ...newCustomer,
    id
  };
  
  mockCustomers.push(customer);
  return Promise.resolve(customer);
};

/**
 * 删除客户
 */
export const deleteCustomer = async (id: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const initialLength = mockCustomers.length;
  const filteredCustomers = mockCustomers.filter(customer => customer.id !== id);
  
  if (filteredCustomers.length === initialLength) {
    return Promise.resolve(false); // 客户不存在
  }
  
  // 更新数组
  mockCustomers.splice(0, mockCustomers.length, ...filteredCustomers);
  return Promise.resolve(true);
};