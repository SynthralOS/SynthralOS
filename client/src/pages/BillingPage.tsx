import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CurrentSubscription } from '@/components/billing/CurrentSubscription';
import { SubscriptionPlans } from '@/components/billing/SubscriptionPlans';
import { AppLayout } from '@/layouts/AppLayout';

// Type definitions for BillingInfo
interface BillingInfo {
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
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
  invoices: {
    id: string;
    number: string;
    status: string;
    amount: number;
    currency: string;
    date: string;
    url: string;
  }[];
}
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, Clock, AlertTriangle } from 'lucide-react';

function BillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('current');

  // Query current subscription info
  const { data: billingInfo, isLoading: isLoadingBilling } = useQuery<BillingInfo>({
    queryKey: ['/api/billing'],
    retry: 2,
  });

  // Handle checkout
  const handleSelectPlan = async (priceId: string) => {
    try {
      setIsSubmitting(true);
      
      const response = await apiRequest('POST', '/api/checkout/subscription', { priceId });
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Checkout Error',
        description: 'Failed to create checkout session. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle portal redirect
  const handleManageSubscription = async () => {
    try {
      setIsSubmitting(true);
      
      const response = await apiRequest('POST', '/api/billing-portal');
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe billing portal
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      toast({
        title: 'Portal Error',
        description: 'Failed to access billing portal. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check for success/canceled query params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    
    if (success) {
      toast({
        title: 'Subscription Updated',
        description: 'Your subscription has been successfully updated.',
        variant: 'default',
      });
      
      // Remove query params
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['/api/billing'] });
    } else if (canceled) {
      toast({
        title: 'Checkout Canceled',
        description: 'You have canceled the checkout process.',
        variant: 'destructive',
      });
      
      // Remove query params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, queryClient]);

  // Get current plan info for comparison in SubscriptionPlans
  const currentPlan = billingInfo?.plan ? {
    tier: billingInfo.plan.tier,
    interval: billingInfo.plan.interval
  } : null;

  return (
    <AppLayout title="Billing & Subscription">
      <Helmet>
        <title>Billing & Subscription - SynthralOS</title>
      </Helmet>
      
      <div className="container max-w-5xl py-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Billing & Subscription</h1>
            <p className="text-muted-foreground mt-1">
              Manage your subscription and billing information
            </p>
          </div>

          <Separator className="my-4" />
          
          {/* Success/error notification banner */}
          {new URLSearchParams(window.location.search).get('success') && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Payment successful</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Your subscription has been updated successfully!</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {new URLSearchParams(window.location.search).get('canceled') && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Checkout canceled</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>You've canceled the checkout process. No changes were made to your subscription.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {isSubmitting && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin mr-3" />
                  <p className="text-sm text-blue-700">Processing your request...</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="current">Current Subscription</TabsTrigger>
              <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current">
              <CurrentSubscription 
                onManageSubscription={handleManageSubscription}
                onChangeSubscription={() => setActiveTab('plans')}
              />
            </TabsContent>
            
            <TabsContent value="plans">
              <SubscriptionPlans 
                currentPlan={currentPlan}
                onSelectPlan={handleSelectPlan}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

export default BillingPage;