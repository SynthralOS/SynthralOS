import express, { Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { 
  users
} from '../../shared/schema';
import { and, eq, desc, sql } from 'drizzle-orm';
import Stripe from 'stripe';

// Define direct column references for easier queries
const priceIdCol = sql.identifier('stripe_price_id');
const amountCol = sql.identifier('price');

const router = express.Router();

// Initialize Stripe with the secret key
const stripeApiKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeApiKey ? new Stripe(stripeApiKey, { apiVersion: "2025-04-30.basil" as any }) : undefined;

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
};

// Get available subscription plans
router.get('/api/subscription-plans', async (req: Request, res: Response) => {
  try {
    // Get all active subscription plans
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);

    if (!plans || plans.length === 0) {
      // Return empty array if no plans found
      return res.json([]);
    }

    // Transform the plans for the client
    const transformedPlans = plans.map(plan => {
      const limits = typeof plan.limits === 'object' ? plan.limits : {};
      // Access fields with type safety
      const amount = plan.price || 0;
      const priceId = plan.stripePriceId || '';
      
      return {
        id: plan.id,
        name: plan.name,
        tier: (limits as any)?.tier || plan.slug || 'free', // Get tier from limits.tier or fallback to slug
        description: plan.description,
        price: amount / 100, // Convert cents to dollars for display
        interval: plan.interval,
        features: plan.features,
        limits: limits,
        stripePriceId: priceId
      };
    });

    res.json(transformedPlans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ message: 'Failed to fetch subscription plans' });
  }
});

// Create checkout session for subscription
router.post('/api/checkout/subscription', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured' });
    }

    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ message: 'Price ID is required' });
    }

    const userId = req.user?.id;
    
    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if price ID exists
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(priceIdCol, priceId))
      .limit(1);

    if (!plan || plan.length === 0) {
      return res.status(404).json({ message: 'Invalid price ID' });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.username,
        metadata: {
          userId: userId.toString(),
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      await storage.updateUser(userId, { stripeCustomerId: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/billing?success=true`,
      cancel_url: `${req.headers.origin}/billing?canceled=true`,
      metadata: {
        userId: userId.toString(),
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Failed to create checkout session' });
  }
});

// Get current subscription details
router.get('/api/billing', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured' });
    }

    const userId = req.user?.id;
    
    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const customerId = user.stripeCustomerId;
    if (!customerId) {
      return res.json({
        subscription: null,
        plan: null,
        invoices: [],
      });
    }

    // Get subscription
    let subscription = null;
    let plan = null;
    
    if (user.stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        // Look up the plan in our database
        if (subscription.items.data[0]?.price.id) {
          const dbPlan = await db
            .select()
            .from(subscriptionPlans)
            .where(eq(priceIdCol, subscription.items.data[0].price.id))
            .limit(1);
            
          if (dbPlan && dbPlan.length > 0) {
            const limits = typeof dbPlan[0].limits === 'object' ? dbPlan[0].limits : {};
            // Access raw properties safely
            const amount = dbPlan[0].price || 0;
            
            plan = {
              ...dbPlan[0],
              price: amount / 100, // Convert to dollars for display
              tier: (limits as any)?.tier || dbPlan[0].slug || 'free'
            };
          }
        }
      } catch (error) {
        console.error('Error retrieving subscription:', error);
        // Subscription may have been deleted on Stripe's end
        subscription = null;
      }
    }

    // Get invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 5,
    });

    // Transform subscription data for client
    const subscriptionData = subscription ? {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    } : null;

    // Transform invoices data for client
    const invoicesData = invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      date: new Date(invoice.created * 1000).toISOString(),
      url: invoice.hosted_invoice_url,
    }));

    res.json({
      subscription: subscriptionData,
      plan,
      invoices: invoicesData,
    });
  } catch (error) {
    console.error('Error fetching billing information:', error);
    res.status(500).json({ message: 'Failed to fetch billing information' });
  }
});

// Create a billing portal session
router.post('/api/billing-portal', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured' });
    }

    const userId = req.user?.id;
    
    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const customerId = user.stripeCustomerId;
    if (!customerId) {
      return res.status(400).json({ message: 'User does not have a Stripe customer ID' });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin}/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ message: 'Failed to create billing portal session' });
  }
});

export default router;