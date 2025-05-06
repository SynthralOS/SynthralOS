import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CheckIcon, XIcon, AlertCircle } from 'lucide-react';

// Types for subscription plans
interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    [key: string]: number;
  };
  tier: string;
  isPopular?: boolean;
}

// Feature check component
const FeatureCheck: React.FC<{ feature: string; included: boolean }> = ({ feature, included }) => (
  <div className="flex items-center py-2">
    {included ? (
      <CheckIcon className="mr-2 h-4 w-4 text-primary" />
    ) : (
      <XIcon className="mr-2 h-4 w-4 text-muted-foreground" />
    )}
    <span className={!included ? 'text-muted-foreground' : ''}>{feature}</span>
  </div>
);

// Subscription plan card component
const PlanCard: React.FC<{
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onSelectPlan: (plan: SubscriptionPlan) => void;
}> = ({ plan, isCurrentPlan, onSelectPlan }) => {
  return (
    <Card className={`flex flex-col ${plan.isPopular ? 'border-primary' : ''}`}>
      <CardHeader>
        {plan.isPopular && (
          <Badge className="w-fit mb-2" variant="outline">
            Most Popular
          </Badge>
        )}
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-4">
          <span className="text-3xl font-bold">${(plan.price / 100).toFixed(2)}</span>
          <span className="text-muted-foreground">/{plan.interval}</span>
        </div>

        <Separator className="my-6" />

        <div className="space-y-1">
          {/* Display limits */}
          {Object.entries(plan.limits).map(([key, value]) => (
            <FeatureCheck
              key={key}
              feature={`${formatLimitName(key)}: ${formatLimitValue(key, value)}`}
              included={true}
            />
          ))}

          {/* Display features */}
          {plan.features.map((feature) => (
            <FeatureCheck key={feature} feature={feature} included={true} />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? "outline" : "default"}
          onClick={() => onSelectPlan(plan)}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Helper to format limit names
const formatLimitName = (key: string): string => {
  switch (key) {
    case 'model.tokens':
      return 'AI Tokens';
    case 'workflow.executions':
      return 'Workflow Runs';
    case 'api.calls':
      return 'API Calls';
    case 'ocr.pages':
      return 'OCR Pages';
    case 'scraper.requests':
      return 'Scraping Requests';
    case 'storage.bytes':
      return 'Storage';
    case 'maxTeamMembers':
      return 'Team Members';
    case 'maxWorkflows':
      return 'Workflows';
    default:
      return key.split('.').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
  }
};

// Helper to format limit values
const formatLimitValue = (key: string, value: number): string => {
  if (key === 'storage.bytes') {
    // Convert bytes to more readable format
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)} GB`;
    } else if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)} MB`;
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)} KB`;
    }
    return `${value} bytes`;
  }
  
  // For large numbers, add commas
  return value.toLocaleString();
};

// Main subscription plans component
const SubscriptionPlans: React.FC<{
  currentTier?: string;
}> = ({ currentTier = 'free' }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get subscription plans
  const { data: plans, isLoading, error } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
    refetchOnWindowFocus: false,
  });
  
  // Create checkout session mutation
  const checkoutMutation = useMutation({
    mutationFn: async (planSlug: string) => {
      return apiRequest('POST', '/api/checkout/subscription', {
        planSlug,
        successUrl: `${window.location.origin}/settings/billing?success=true`,
        cancelUrl: `${window.location.origin}/settings/billing?canceled=true`,
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    onError: (error) => {
      toast({
        title: 'Error creating checkout session',
        description: 'There was a problem creating your checkout session. Please try again later.',
        variant: 'destructive',
      });
    },
  });
  
  // Handler for selecting a plan
  const handleSelectPlan = (plan: SubscriptionPlan) => {
    checkoutMutation.mutate(plan.slug);
  };
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading subscription plans</AlertTitle>
        <AlertDescription>
          There was a problem fetching the subscription plans. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Subscription Plans</h2>
        <p className="text-muted-foreground mt-2">
          Choose the plan that works best for you and your team
        </p>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-7 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-10 w-20 mb-4" />
                <Separator className="my-6" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans?.map((plan: SubscriptionPlan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={plan.tier === currentTier}
              onSelectPlan={handleSelectPlan}
            />
          ))}
        </div>
      )}
      
      <div className="mt-12 text-center text-muted-foreground">
        <p>Need a custom plan? Contact our sales team</p>
        <Button variant="link">Contact Sales</Button>
      </div>
    </div>
  );
};

export default SubscriptionPlans;