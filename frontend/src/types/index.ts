export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export interface CarInfo {
  make: string;
  model: string;
  year: number;
  registration: string;
  vin?: string;
  color?: string;
}

export interface OwnerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface InsuranceInfo {
  company?: string;
  policy_number?: string;
  claim_number?: string;
  contact_person?: string;
  contact_phone?: string;
}

export interface Photo {
  id: string;
  base64_data: string;
  caption?: string;
  photo_type: string;
  created_at: string;
}

export interface CostItem {
  description: string;
  amount: number;
  item_type: string;
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  changed_by: string;
  notes?: string;
}

export interface ActivityLogEntry {
  action: string;
  employee: string;
  timestamp: string;
  details?: string;
  old_value?: string;
  new_value?: string;
}

export interface Job {
  id: string;
  car_info: CarInfo;
  owner_info: OwnerInfo;
  insurance_info?: InsuranceInfo;
  damage_description: string;
  status: string;
  photos: Photo[];
  estimated_cost?: number;
  actual_cost?: number;
  cost_items: CostItem[];
  notes?: string;
  status_history: StatusHistoryEntry[];
  activity_log?: ActivityLogEntry[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface DashboardStats {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  status_breakdown: { [key: string]: number };
  total_estimated_revenue: number;
  total_actual_revenue: number;
  pending_revenue: number;
  completed_revenue: number;
}

export const JOB_STATUSES = [
  'Received',
  'Awaiting Parts',
  'Awaiting Approval',
  'In Progress',
  'Ready for Payment',
  'Completed',
  'Collected',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_COLORS: { [key: string]: string } = {
  'Received': '#3B82F6',
  'Awaiting Parts': '#F59E0B',
  'Awaiting Approval': '#8B5CF6',
  'In Progress': '#10B981',
  'Ready for Payment': '#EC4899',
  'Completed': '#059669',
  'Collected': '#6B7280',
};
