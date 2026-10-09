export type CenterStatus = 'red' | 'yellow' | 'green';

export type ResourceStatus = 'pending' | 'approved' | 'rejected' | string;

export interface User {
  id: number | string;
  fullName: string;
  email: string;
  role: string;
}

export interface Center {
  id: number | string;
  centerName: string;
  type: string;
  latitude: number;
  longitude: number;
  status: CenterStatus;
}

export interface Supply {
  id: number | string;
  supplyName: string;
  unit: string;
}

export interface InventoryItem {
  id: number | string;
  centerId: number | string;
  supplyId: number | string;
  quantity: number;
  minThreshold: number;
  status: string;
  centerName?: string;
  supplyName?: string;
  center?: { id: number | string; centerName?: string; name?: string } | null;
  supply?: { id: number | string; supplyName?: string; name?: string } | null;
}

export interface RedistributionRequest {
  id: number | string;
  sourceCenterId: number | string;
  targetCenterId: number | string;
  supplyId: number | string;
  quantity: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  sourceCenterName?: string;
  targetCenterName?: string;
  supplyName?: string;
  sourceCenter?: { id: number | string; centerName?: string; name?: string } | null;
  targetCenter?: { id: number | string; centerName?: string; name?: string } | null;
  supply?: { id: number | string; supplyName?: string; name?: string } | null;
}

export interface DashboardData {
  centersByStatus: {
    red: number;
    yellow: number;
    green: number;
    total: number;
  };
  pendingRequests: number;
  alertsLast24h: number;
  recentAlerts: RecentAlert[];
}

export interface RecentAlert {
  id?: number | string;
  message?: string;
  alertMessage?: string;
  title?: string;
  description?: string;
  type?: string;
  severity?: string;
  centerName?: string;
  supplyName?: string;
  createdAt?: string;
  date?: string;
  [key: string]: unknown;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}
