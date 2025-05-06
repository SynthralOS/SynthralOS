import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Download, 
  RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  date: string;
  url: string;
}

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
  invoices: Invoice[];
}

export function CurrentSubscription({ 
  onManageSubscription, 
  onChangeSubscription 
}: { 
  onManageSubscription: () => void; 
  onChangeSubscription: () => void; 
}) {
  const { toast } = useToast();
  
  const { data, isLoading, error } = useQuery<BillingInfo>({
    queryKey: ['/api/billing'],
    retry: 2,
  });

  // Handle error notifications via useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading subscription",
        description: "Failed to load your subscription details. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div>Failed to load subscription details</div>;
  }

  // No subscription yet
  if (!data?.subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>You're currently on the free plan</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Upgrade to a paid plan to unlock advanced features and higher usage limits.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={onChangeSubscription}>View Plans</Button>
        </CardFooter>
      </Card>
    );
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'trialing':
        return <Badge variant="warning">Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="outline">Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>
                {data.plan?.name || 'Subscription'} {getStatusBadge(data.subscription.status)}
              </CardDescription>
            </div>
            {data.subscription.cancelAtPeriodEnd && (
              <div className="flex items-center text-sm text-amber-500">
                <Clock size={16} className="mr-1" />
                <span>Cancels on {formatDate(data.subscription.currentPeriodEnd)}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.plan && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Plan Details</span>
                  <span className="text-xl font-bold">
                    ${data.plan.price}/{data.plan.interval}
                  </span>
                </div>
                
                {/* Limits */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Workflows</span>
                    <span className="font-medium">
                      {data.plan.limits.workflows === -1 ? 'Unlimited' : data.plan.limits.workflows}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Executions</span>
                    <span className="font-medium">
                      {data.plan.limits.executions_per_day === -1 ? 
                        'Unlimited' : 
                        `${data.plan.limits.executions_per_day}/day`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model Tokens</span>
                    <span className="font-medium">
                      {data.plan.limits.model_tokens_per_month === -1 ? 
                        'Unlimited' : 
                        `${Math.round(data.plan.limits.model_tokens_per_month / 1000)}K/month`}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <span className="font-medium">Billing Period</span>
              <div className="mt-1 text-sm">
                <div className="flex justify-between items-center">
                  <span>Current period started</span>
                  <span>{formatDate(data.subscription.currentPeriodStart)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span>Current period ends</span>
                  <span>{formatDate(data.subscription.currentPeriodEnd)}</span>
                </div>
              </div>
            </div>
            
            {data.invoices.length > 0 && (
              <div>
                <span className="font-medium">Recent Invoices</span>
                <div className="mt-2 space-y-2">
                  {data.invoices.slice(0, 3).map((invoice) => (
                    <div key={invoice.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <span className="mr-2">{formatDate(invoice.date)}</span>
                        <span>
                          {invoice.status === 'paid' ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : invoice.status === 'open' ? (
                            <Clock size={16} className="text-amber-500" />
                          ) : (
                            <AlertCircle size={16} className="text-red-500" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-3">${invoice.amount}</span>
                        <a 
                          href={invoice.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onChangeSubscription}>
            Change Plan
          </Button>
          <Button onClick={onManageSubscription}>
            Manage Subscription
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}