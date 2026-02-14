// 定义客户类型
export interface Customer {
  id: string;
  name: string;
  contactName: string;
  contactTitle?: string;
  contactEmail?: string;
  contactWeChat?: string;
  contactAvatar?: string;
  status: 'Active' | 'Lead' | 'Follow-up' | 'Onboarded';
  priority?: 'Low' | 'Medium' | 'High';
  contactStatus?: 'Contacted' | 'Replied' | 'No Reply';
  nextActionIcon: 'event' | 'schedule' | 'warning' | 'check_circle' | 'calendar' | 'clock' | 'alert_triangle' | 'check';
  nextActionText: string;
  nextStepAction?: string;
  nextStepDate?: string;
  notes?: string;
  teamMembers?: TeamMember[];
  activities?: Activity[];
}

// 定义团队成员类型
export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
}

// 定义活动记录类型
export interface Activity {
  id: string;
  user: string;
  description: string;
  timestamp: string;
  isRecent?: boolean;
}