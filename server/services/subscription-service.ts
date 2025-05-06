/**
 * Subscription Service
 * 
 * Handles subscription management through Stripe, including:
 * - Creating and managing subscriptions
 * - Processing subscription events
 * - Managing billing and invoices
 * - Handling subscription upgrades/downgrades
 */

import Stripe from 'stripe';
import { db } from "../db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  subscriptionPlans,
  users,
  organizations,
  usageQuotas,
} from "@shared/schema";
import type { User, Organization, SubscriptionPlan } from "@shared/schema";
import { UsageType, QuotaPeriod, setUsageQuota } from './usage-tracking';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Use latest API version
});

// Subscription tiers and their limits
export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

// Define tier limits
interface TierLimits {
  [UsageType.MODEL_TOKENS]: number;
  [UsageType.WORKFLOW_EXECUTIONS]: number;
  [UsageType.OCR_PAGES]: number;
  [UsageType.SCRAPER_REQUESTS]: number;
  [UsageType.API_CALLS]: number;
  [UsageType.STORAGE_BYTES]: number;
  maxTeamMembers?: number;
  maxWorkflows?: number;
  features: string[];
}

// Subscription tier limits
const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    [UsageType.MODEL_TOKENS]: 50000,
    [UsageType.WORKFLOW_EXECUTIONS]: 100,
    [UsageType.OCR_PAGES]: 50,
    [UsageType.SCRAPER_REQUESTS]: 50,
    [UsageType.API_CALLS]: 1000,
    [UsageType.STORAGE_BYTES]: 100 * 1024 * 1024, // 100 MB
    maxTeamMembers: 2,
    maxWorkflows: 5,
    features: [
      'Basic Workflows',
      'Manual Triggers',
      'Public Templates',
      'Community Support',
    ],
  },
  [SubscriptionTier.STARTER]: {
    [UsageType.MODEL_TOKENS]: 500000,
    [UsageType.WORKFLOW_EXECUTIONS]: 1000,
    [UsageType.OCR_PAGES]: 500,
    [UsageType.SCRAPER_REQUESTS]: 500,
    [UsageType.API_CALLS]: 10000,
    [UsageType.STORAGE_BYTES]: 1 * 1024 * 1024 * 1024, // 1 GB
    maxTeamMembers: 5,
    maxWorkflows: 20,
    features: [
      'Advanced Workflows',
      'Scheduled Triggers',
      'Custom Templates',
      'Email Support',
      'API Access',
      'Basic Analytics',
    ],
  },
  [SubscriptionTier.PROFESSIONAL]: {
    [UsageType.MODEL_TOKENS]: 2000000,
    [UsageType.WORKFLOW_EXECUTIONS]: 10000,
    [UsageType.OCR_PAGES]: 5000,
    [UsageType.SCRAPER_REQUESTS]: 5000,
    [UsageType.API_CALLS]: 100000,
    [UsageType.STORAGE_BYTES]: 10 * 1024 * 1024 * 1024, // 10 GB
    maxTeamMembers: 15,
    maxWorkflows: 100,
    features: [
      'Everything in Starter',
      'Priority Support',
      'Webhook Triggers',
      'Advanced Analytics',
      'Team Collaboration',
      'Custom Integrations',
      'Audit Logs',
    ],
  },
  [SubscriptionTier.ENTERPRISE]: {
    [UsageType.MODEL_TOKENS]: 10000000,
    [UsageType.WORKFLOW_EXECUTIONS]: 100000,
    [UsageType.OCR_PAGES]: 50000,
    [UsageType.SCRAPER_REQUESTS]: 50000,
    [UsageType.API_CALLS]: 1000000,
    [UsageType.STORAGE_BYTES]: 100 * 1024 * 1024 * 1024, // 100 GB
    maxTeamMembers: 100,
    maxWorkflows: 500,
    features: [
      'Everything in Professional',
      'Dedicated Support',
      'Custom SLAs',
      'Advanced Security',
      'SSO Integration',
      'Custom Models',
      'Private Deployment',
      'Usage Insights',
    ],
  },
};

/**
 * Create or update a customer in Stripe
 */
export async function createOrUpdateCustomer(user: User): Promise<Stripe.Customer> {
  let customer: Stripe.Customer;
  
  if (user.stripeCustomerId) {
    // Update existing customer
    customer = await stripe.customers.update(
      user.stripeCustomerId,
      {
        email: user.email,
        name: user.name || user.username,
        metadata: {
          userId: user.id.toString(),
        },
      }
    ) as Stripe.Customer;
  } else {
    // Create new customer
    customer = await stripe.customers.create({
      email: user.email,
      name: user.name || user.username,
      metadata: {
        userId: user.id.toString(),
      },
    });
    
    // Update user with Stripe customer ID
    await db
      .update(users)
      .set({ stripeCustomerId: customer.id })
      .where(eq(users.id, user.id));
  }
  
  return customer;
}

/**
 * Create or update a customer for an organization
 */
export async function createOrUpdateOrganizationCustomer(organization: Organization): Promise<Stripe.Customer> {
  let customer: Stripe.Customer;
  
  if (organization.stripeCustomerId) {
    // Update existing customer
    customer = await stripe.customers.update(
      organization.stripeCustomerId,
      {
        name: organization.name,
        metadata: {
          organizationId: organization.id.toString(),
        },
      }
    ) as Stripe.Customer;
  } else {
    // Create new customer
    customer = await stripe.customers.create({
      name: organization.name,
      metadata: {
        organizationId: organization.id.toString(),
      },
    });
    
    // Update organization with Stripe customer ID
    await db
      .update(organizations)
      .set({ stripeCustomerId: customer.id })
      .where(eq(organizations.id, organization.id));
  }
  
  return customer;
}

/**
 * Create a subscription checkout session for a user
 */
export async function createSubscriptionCheckoutSession(
  user: User,
  planSlug: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  // Get the subscription plan
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.slug, planSlug)
  });
  
  if (!plan) {
    throw new Error(`Subscription plan ${planSlug} not found`);
  }
  
  // Ensure user has a Stripe customer ID
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await createOrUpdateCustomer(user);
    customerId = customer.id;
  }
  
  // Create the checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user.id.toString(),
      planId: plan.id.toString(),
    },
  });
  
  return session;
}

/**
 * Create a subscription checkout session for an organization
 */
export async function createOrganizationSubscriptionCheckoutSession(
  organization: Organization,
  planSlug: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  // Get the subscription plan
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.slug, planSlug)
  });
  
  if (!plan) {
    throw new Error(`Subscription plan ${planSlug} not found`);
  }
  
  // Ensure organization has a Stripe customer ID
  let customerId = organization.stripeCustomerId;
  if (!customerId) {
    const customer = await createOrUpdateOrganizationCustomer(organization);
    customerId = customer.id;
  }
  
  // Create the checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId: organization.id.toString(),
      planId: plan.id.toString(),
    },
  });
  
  return session;
}

/**
 * Create a billing portal session for a user
 */
export async function createBillingPortalSession(
  user: User,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!user.stripeCustomerId) {
    throw new Error('User does not have a Stripe customer ID');
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });
  
  return session;
}

/**
 * Create a billing portal session for an organization
 */
export async function createOrganizationBillingPortalSession(
  organization: Organization,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!organization.stripeCustomerId) {
    throw new Error('Organization does not have a Stripe customer ID');
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: returnUrl,
  });
  
  return session;
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string
): Promise<void> {
  let event: Stripe.Event;
  
  // Verify the webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    throw new Error('Webhook signature verification failed');
  }
  
  // Handle specific webhook events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
      
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
      
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
      
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // Extract metadata
  const userId = session.metadata?.userId;
  const organizationId = session.metadata?.organizationId;
  const planId = session.metadata?.planId;
  
  if (!planId) {
    console.error('No plan ID in checkout session metadata');
    return;
  }
  
  // Get the subscription
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    // Update the user or organization with subscription details
    if (userId) {
      await updateUserSubscription(parseInt(userId), subscription);
    } else if (organizationId) {
      await updateOrganizationSubscription(parseInt(organizationId), subscription);
    }
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  // Get customer
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  
  // Update user or organization
  const userId = customer.metadata?.userId;
  const organizationId = customer.metadata?.organizationId;
  
  if (userId) {
    await updateUserSubscription(parseInt(userId), subscription);
  } else if (organizationId) {
    await updateOrganizationSubscription(parseInt(organizationId), subscription);
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  // Get customer
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  
  // Update user or organization
  const userId = customer.metadata?.userId;
  const organizationId = customer.metadata?.organizationId;
  
  if (userId) {
    await updateUserSubscription(parseInt(userId), subscription);
  } else if (organizationId) {
    await updateOrganizationSubscription(parseInt(organizationId), subscription);
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  // Get customer
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  
  // Downgrade user or organization to free plan
  const userId = customer.metadata?.userId;
  const organizationId = customer.metadata?.organizationId;
  
  if (userId) {
    await db
      .update(users)
      .set({ 
        stripeSubscriptionId: null,
        subscriptionStatus: 'inactive',
        subscriptionTier: SubscriptionTier.FREE 
      })
      .where(eq(users.id, parseInt(userId)));
      
    // Update quota limits to free tier
    await applySubscriptionQuotas(parseInt(userId));
  } else if (organizationId) {
    await db
      .update(organizations)
      .set({ 
        stripeSubscriptionId: null,
        subscriptionStatus: 'inactive',
        subscriptionTier: SubscriptionTier.FREE 
      })
      .where(eq(organizations.id, parseInt(organizationId)));
      
    // Update quota limits to free tier
    await applyOrganizationSubscriptionQuotas(parseInt(organizationId));
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  // Nothing special needed here - subscription status is handled by subscription events
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // Get customer
  const customer = await stripe.customers.retrieve(invoice.customer as string);
  
  // Update subscription status for user or organization
  const userId = customer.metadata?.userId;
  const organizationId = customer.metadata?.organizationId;
  
  if (userId) {
    await db
      .update(users)
      .set({ subscriptionStatus: 'past_due' })
      .where(eq(users.id, parseInt(userId)));
  } else if (organizationId) {
    await db
      .update(organizations)
      .set({ subscriptionStatus: 'past_due' })
      .where(eq(organizations.id, parseInt(organizationId)));
  }
  
  // TODO: Send notification about failed payment
}

/**
 * Update a user's subscription details from Stripe
 */
async function updateUserSubscription(userId: number, subscription: Stripe.Subscription): Promise<void> {
  // Get the subscription plan
  const items = subscription.items.data;
  if (items.length === 0) return;
  
  const priceId = items[0].price.id;
  
  // Find the subscription plan by price ID
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.priceId, priceId)
  });
  
  if (!plan) {
    console.error(`No plan found for price ID: ${priceId}`);
    return;
  }
  
  // Get subscription status
  let status = subscription.status;
  
  // Update user record
  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      subscriptionTier: plan.slug as SubscriptionTier,
    })
    .where(eq(users.id, userId));
  
  // Apply quota limits based on the plan
  await applySubscriptionQuotas(userId);
}

/**
 * Update an organization's subscription details from Stripe
 */
async function updateOrganizationSubscription(
  organizationId: number,
  subscription: Stripe.Subscription
): Promise<void> {
  // Get the subscription plan
  const items = subscription.items.data;
  if (items.length === 0) return;
  
  const priceId = items[0].price.id;
  
  // Find the subscription plan by price ID
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.priceId, priceId)
  });
  
  if (!plan) {
    console.error(`No plan found for price ID: ${priceId}`);
    return;
  }
  
  // Get subscription status
  let status = subscription.status;
  
  // Update organization record
  await db
    .update(organizations)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      subscriptionTier: plan.slug as SubscriptionTier,
    })
    .where(eq(organizations.id, organizationId));
  
  // Apply quota limits based on the plan
  await applyOrganizationSubscriptionQuotas(organizationId);
}

/**
 * Apply subscription quota limits to a user
 */
export async function applySubscriptionQuotas(userId: number): Promise<void> {
  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }
  
  // Get tier limits
  const tier = user.subscriptionTier as SubscriptionTier || SubscriptionTier.FREE;
  const limits = TIER_LIMITS[tier];
  
  // Set quotas for each usage type
  for (const [usageType, limit] of Object.entries(limits)) {
    // Skip non-usage properties
    if (usageType === 'features' || usageType === 'maxTeamMembers' || usageType === 'maxWorkflows') {
      continue;
    }
    
    await setUsageQuota({
      userId,
      usageType,
      limit,
      period: QuotaPeriod.MONTH,
      isHardLimit: tier !== SubscriptionTier.ENTERPRISE, // Enterprise plans allow overages
    });
  }
}

/**
 * Apply subscription quota limits to an organization
 */
export async function applyOrganizationSubscriptionQuotas(organizationId: number): Promise<void> {
  // Get organization
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId)
  });
  
  if (!organization) {
    throw new Error(`Organization with ID ${organizationId} not found`);
  }
  
  // Get tier limits
  const tier = organization.subscriptionTier as SubscriptionTier || SubscriptionTier.FREE;
  const limits = TIER_LIMITS[tier];
  
  // Set quotas for each usage type
  for (const [usageType, limit] of Object.entries(limits)) {
    // Skip non-usage properties
    if (usageType === 'features' || usageType === 'maxTeamMembers' || usageType === 'maxWorkflows') {
      continue;
    }
    
    await setUsageQuota({
      organizationId,
      usageType,
      limit,
      period: QuotaPeriod.MONTH,
      isHardLimit: tier !== SubscriptionTier.ENTERPRISE, // Enterprise plans allow overages
    });
  }
}

/**
 * Get available subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true))
    .orderBy(subscriptionPlans.sortOrder);
}

/**
 * Create or update a subscription plan
 */
export async function createOrUpdateSubscriptionPlan(plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  // Check if plan exists
  if (plan.id) {
    const [updated] = await db
      .update(subscriptionPlans)
      .set(plan)
      .where(eq(subscriptionPlans.id, plan.id))
      .returning();
    
    return updated;
  } else {
    const [newPlan] = await db
      .insert(subscriptionPlans)
      .values(plan as any)
      .returning();
    
    return newPlan;
  }
}

/**
 * Delete a subscription plan
 */
export async function deleteSubscriptionPlan(planId: number): Promise<void> {
  await db
    .delete(subscriptionPlans)
    .where(eq(subscriptionPlans.id, planId));
}