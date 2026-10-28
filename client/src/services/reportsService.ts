import api from './api';

export interface ReportsDto {
  casePerformance: {
    active: number;
    closed: number;
    avgDaysToClose: number;
  };
  productivity: {
    userId: string;
    name: string;
    totalHours: number;
    billedHours: number;
    totalAmount: number;
  }[];
  financial: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    monthlyTrend: { year: number; month: number; invoiced: number; collected: number }[];
  };
  clientActivity: {
    clientId: string;
    clientName: string;
    matterCount: number;
    activeMatters: number;
    lastUpdated: string | null;
  }[];
}

const reportsService = {
  get: () => api.get<ReportsDto>('/reports').then(r => r.data),
};

export default reportsService;