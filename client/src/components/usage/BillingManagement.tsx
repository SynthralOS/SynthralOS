import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CreditCard, Calendar, CheckCircle, Clock } from 'lucide-react';

// Types for billing information
interface BillingInfo {
  subscriptionStatus: string;
  subscriptionTier: string;
  planName: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  invoices: {
    id: string;
    number: string;
    amount: number;
    status: string;
    date: string;
    pdfUrl: string;
  }[];
}

// Current subscription information card
const SubscriptionInfo: React.FC<{ billingInfo: BillingInfo }> = ({ billingInfo }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Subscription</CardTitle>
        <CardDescription>
          Manage your current plan and billing details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{billingInfo.planName}</h3>
            <p className="text-muted-foreground">
              Status: {formatSubscriptionStatus(billingInfo.subscriptionStatus)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Current period: {formatDate(billingInfo.currentPeriodStart)} - {formatDate(billingInfo.currentPeriodEnd)}</span>
          </div>
          
          {billingInfo.cancelAtPeriodEnd && (
            <Alert variant="default">
              <Clock className="h-4 w-4" />
              <AlertTitle>Subscription Ending</AlertTitle>
              <AlertDescription>
                Your subscription will end on {formatDate(billingInfo.currentPeriodEnd)}
              </AlertDescription>
            </Alert>
          )}
          
          {billingInfo.paymentMethod && (
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatCardBrand(billingInfo.paymentMethod.brand)} ending in {billingInfo.paymentMethod.last4} • 
                Exp: {billingInfo.paymentMethod.expMonth}/{billingInfo.paymentMethod.expYear}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Recent invoices card
const RecentInvoices: React.FC<{ invoices: BillingInfo['invoices'] }> = ({ invoices }) => {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>
            View and download your recent invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">No invoices yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Invoices</CardTitle>
        <CardDescription>
          View and download your recent invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">Invoice #{invoice.number}</div>
                <div className="text-sm text-muted-foreground">{formatDate(invoice.date)}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-medium">${(invoice.amount / 100).toFixed(2)}</div>
                  <div className="text-sm">
                    {invoice.status === 'paid' ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" /> Paid
                      </span>
                    ) : (
                      <span>{invoice.status}</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                    Download
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper functions for formatting
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatSubscriptionStatus = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial';
    case 'canceled':
      return 'Canceled';
    case 'past_due':
      return 'Past Due';
    case 'incomplete':
      return 'Incomplete';
    case 'incomplete_expired':
      return 'Expired';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const formatCardBrand = (brand: string): string => {
  switch (brand.toLowerCase()) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'American Express';
    case 'discover':
      return 'Discover';
    default:
      return brand.charAt(0).toUpperCase() + brand.slice(1);
  }
};

// Main billing management component
const BillingManagement: React.FC = () => {
  const { toast } = useToast();
  
  // Get billing information
  const { data: billingInfo, isLoading, error } = useQuery<BillingInfo>({
    queryKey: ['/api/billing'],
    refetchOnWindowFocus: false,
  });
  
  // Mutation for creating a billing portal session
  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/billing-portal', {
        returnUrl: `${window.location.origin}/settings/billing`,
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      // Redirect to Stripe Billing Portal
      window.location.href = data.url;
    },
    onError: (error) => {
      toast({
        title: 'Error creating billing portal session',
        description: 'There was a problem accessing the billing portal. Please try again later.',
        variant: 'destructive',
      });
    },
  });
  
  // Handler for opening billing portal
  const handleOpenBillingPortal = () => {
    billingPortalMutation.mutate();
  };
  
  // Handle errors
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading billing information</AlertTitle>
        <AlertDescription>
          There was a problem fetching your billing information. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Billing &amp; Invoices</h2>
        <Button 
          onClick={handleOpenBillingPortal}
          disabled={isLoading || billingPortalMutation.isPending}
        >
          {billingPortalMutation.isPending ? "Loading..." : "Manage Billing"}
        </Button>
      </div>
      
      <Separator />
      
      {isLoading ? (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between py-2">
                <div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div>
                  <Skeleton className="h-5 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between py-2">
                <div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div>
                  <Skeleton className="h-5 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-8">
          {billingInfo && <SubscriptionInfo billingInfo={billingInfo} />}
          <RecentInvoices invoices={billingInfo?.invoices || []} />
        </div>
      )}
    </div>
  );
};

export default BillingManagement;