import { apiRequest } from '../queryClient';

export interface UsageSummary {
  usageType: string;
  totalUsage: number;
  quota: number | null;
  percentUsed: number | null;
}

export interface ModelUsage {
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  count: number;
}

export interface UsageData {
  period: {
    start: string;
    end: string;
  };
  summary: UsageSummary[];
  modelUsage: ModelUsage[];
}

export interface DailyUsageData {
  date: string;
  type: string;
  value: number;
}

export interface UsageByTypeData {
  type: string;
  value: number;
  percentage: number;
}

export interface ModelUsageBreakdown {
  model: string;
  tokens: number;
  cost: number;
  percentage: number;
}

export interface UsageHistoryData {
  daily: DailyUsageData[];
  byType: UsageByTypeData[];
  byModel: ModelUsageBreakdown[];
  totalCost: number;
  totalTokens: number;
}

export interface UsageApiClient {
  getCurrentUsage: (startDate?: Date, endDate?: Date) => Promise<UsageData>;
  getUsageHistory: (period?: '7d' | '30d' | '90d') => Promise<UsageHistoryData>;
}

export const usageApi: UsageApiClient = {
  getCurrentUsage: async (startDate?: Date, endDate?: Date) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate.toISOString());
    if (endDate) params.append('end', endDate.toISOString());
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest('GET', `/api/usage${queryString}`);
    return response.json();
  },
  
  getUsageHistory: async (period: '7d' | '30d' | '90d' = '30d') => {
    const response = await apiRequest('GET', `/api/usage/history?period=${period}`);
    return response.json();
  }
};