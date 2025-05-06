import { apiRequest } from '../queryClient';

export interface SubscriptionPlan {
  id: number;
  name: string;
  tier: string;
  description: string;
  price: number;
  interval: string;
  features: string[];
  limits: {
    workflows: number;
    executions_per_day: number;
    api_calls_per_day: number;
    model_tokens_per_month: number;
  };
  stripePriceId: string;
}

export interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  date: string;
  url: string;
}

export interface BillingInfo {
  subscription: Subscription | null;
  plan: {
    id: number;
    name: string;
    tier: string;
    interval: string;
    price: number;
    features: string[];
    limits: {
      workflows: number;
      executions_per_day: number;
      api_calls_per_day: number;
      model_tokens_per_month: number;
    };
  } | null;
  invoices: Invoice[];
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface PortalSession {
  url: string;
}

export interface BillingApiClient {
  getSubscriptionPlans: () => Promise<SubscriptionPlan[]>;
  getCurrentSubscription: () => Promise<BillingInfo>;
  createCheckoutSession: (priceId: string) => Promise<CheckoutSession>;
  createBillingPortalSession: () => Promise<PortalSession>;
}

export const billingApi: BillingApiClient = {
  getSubscriptionPlans: async () => {
    const response = await apiRequest('GET', '/api/subscription-plans');
    return response.json();
  },
  
  getCurrentSubscription: async () => {
    const response = await apiRequest('GET', '/api/billing');
    return response.json();
  },
  
  createCheckoutSession: async (priceId: string) => {
    const response = await apiRequest('POST', '/api/checkout/subscription', { priceId });
    return response.json();
  },
  
  createBillingPortalSession: async () => {
    const response = await apiRequest('POST', '/api/billing-portal');
    return response.json();
  }
};