import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPlan {
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

export function SubscriptionPlans({ 
  currentPlan, 
  onSelectPlan 
}: { 
  currentPlan?: { tier: string; interval: string } | null; 
  onSelectPlan: (priceId: string) => void;
}) {
  const { toast } = useToast();
  
  const { data: plans = [], isLoading, error } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Always declare useEffect first before any conditional returns
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading plans",
        description: "Failed to load subscription plans. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="flex-1">
              <Skeleton className="h-10 w-24 mb-6" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <div>Failed to load subscription plans</div>;
  }

  // Group plans by tier and interval
  const groupedPlans: Record<string, SubscriptionPlan[]> = {};
  plans?.forEach((plan: SubscriptionPlan) => {
    if (!groupedPlans[plan.tier]) {
      groupedPlans[plan.tier] = [];
    }
    groupedPlans[plan.tier].push(plan);
  });

  // Sort tiers by price for display
  const sortedTiers = Object.keys(groupedPlans).sort((a, b) => {
    const aPrice = Math.min(...groupedPlans[a].map(p => p.price));
    const bPrice = Math.min(...groupedPlans[b].map(p => p.price));
    return aPrice - bPrice;
  });

  return (
    <div className="space-y-8">
      {sortedTiers.map((tier) => {
        // Sort plans by interval (monthly first, then yearly)
        const tierPlans = groupedPlans[tier].sort((a, b) => 
          a.interval === 'month' ? -1 : 1
        );
        
        return (
          <div key={tier} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tierPlans.map((plan) => {
              // Check if this is the current plan
              const isCurrentPlan = currentPlan && 
                currentPlan.tier === plan.tier && 
                currentPlan.interval === plan.interval;
                
              // Calculate monthly equivalent for annual plans
              const monthlyEquivalent = plan.interval === 'year' 
                ? (plan.price / 12).toFixed(2) 
                : null;
                
              // Calculate savings percentage for annual plans
              const savingsPercent = plan.interval === 'year' && groupedPlans[tier].length > 1
                ? (() => {
                    const monthlyPlan = groupedPlans[tier].find(p => p.interval === 'month');
                    if (monthlyPlan) {
                      return Math.round(100 - ((plan.price / 12) / monthlyPlan.price * 100));
                    }
                    return null;
                  })()
                : null;

              return (
                <Card 
                  key={plan.id}
                  className={`flex flex-col ${isCurrentPlan ? 'border-primary' : ''}`}
                >
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="mb-6">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/{plan.interval}</span>
                      
                      {monthlyEquivalent && (
                        <div className="text-sm text-muted-foreground mt-1">
                          ${monthlyEquivalent}/month equivalent
                        </div>
                      )}
                      
                      {savingsPercent && (
                        <div className="text-sm text-emerald-600 font-medium mt-1">
                          Save {savingsPercent}% vs monthly
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {/* Display limits */}
                      <div className="text-sm">
                        <span className="font-medium">Limits:</span>
                        <ul className="mt-1 space-y-1">
                          <li className="flex items-center">
                            <span className="w-6 h-6 mr-2 flex items-center justify-center">
                              {plan.limits.workflows === -1 ? <span className="text-primary">∞</span> : plan.limits.workflows}
                            </span>
                            <span>Workflows</span>
                          </li>
                          <li className="flex items-center">
                            <span className="w-6 h-6 mr-2 flex items-center justify-center">
                              {plan.limits.executions_per_day === -1 ? <span className="text-primary">∞</span> : plan.limits.executions_per_day}
                            </span>
                            <span>Executions per day</span>
                          </li>
                          <li className="flex items-center">
                            <span className="w-6 h-6 mr-2 flex items-center justify-center">
                              {plan.limits.model_tokens_per_month === -1 ? 
                                <span className="text-primary">∞</span> : 
                                `${Math.round(plan.limits.model_tokens_per_month / 1000)}K`}
                            </span>
                            <span>Tokens per month</span>
                          </li>
                        </ul>
                      </div>
                      
                      {/* Display features */}
                      <div className="mt-4">
                        <span className="text-sm font-medium">Features:</span>
                        <ul className="mt-2 space-y-1">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm">
                              <Check size={16} className="mr-2 text-primary" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={Boolean(isCurrentPlan)}
                      onClick={() => onSelectPlan(plan.stripePriceId)}
                    >
                      {isCurrentPlan ? "Current Plan" : "Select Plan"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}