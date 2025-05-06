import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideCheck } from 'lucide-react';
import { Footer } from '@/components/landing/Footer';

const plans = [
  {
    name: "Starter",
    description: "Perfect for individuals and small teams just getting started with automation.",
    price: "$99",
    period: "per month",
    features: [
      "5 active workflows",
      "1,000 executions per month",
      "2 agent types",
      "Standard OCR processing",
      "Email support",
      "Community access"
    ],
    cta: "Start Free Trial",
    popular: false
  },
  {
    name: "Professional",
    description: "For growing businesses with more advanced automation needs.",
    price: "$299",
    period: "per month",
    features: [
      "Unlimited workflows",
      "10,000 executions per month",
      "5 agent types",
      "Advanced OCR with engine switching",
      "Web scraping capabilities",
      "Social monitoring (limited)",
      "Priority support",
      "API access"
    ],
    cta: "Start Free Trial",
    popular: true
  },
  {
    name: "Enterprise",
    description: "For organizations requiring advanced features and enterprise-grade security.",
    price: "Custom",
    period: "Contact us for pricing",
    features: [
      "Unlimited workflows",
      "Unlimited executions",
      "All agent types",
      "Enterprise OCR with full capabilities",
      "Advanced web scraping",
      "Comprehensive social monitoring",
      "Dedicated support manager",
      "SOC 2 compliance",
      "Role-based access control",
      "White labeling",
      "Self-hosted option"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header/Nav */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-semibold">S</div>
                <span className="text-xl font-bold dark:text-white">SynthralOS</span>
              </div>
            </Link>
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Pricing Plans</h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              Choose the right plan to automate your business processes with SynthralOS
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`h-full flex flex-col ${plan.popular ? 'border-violet-500 shadow-lg dark:border-violet-400' : 'border-slate-200 dark:border-slate-700'}`}>
                  {plan.popular && (
                    <div className="bg-violet-500 text-white text-center py-1 text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="mb-6">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-2">{plan.period}</span>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <span className="mr-2 text-green-500">
                            <LucideCheck className="h-5 w-5" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-violet-600 hover:bg-violet-700' : ''}`} 
                      variant={plan.popular ? 'default' : 'outline'}
                      asChild
                    >
                      <Link href={plan.cta === 'Contact Sales' ? '/contact' : '/register'}>
                        {plan.cta}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto grid gap-8">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-bold mb-3">Can I upgrade or downgrade my plan at any time?</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Yes, you can upgrade your plan at any time. The new charges will be prorated for the remainder of your billing cycle. If you need to downgrade, the change will take effect at the start of your next billing cycle.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-bold mb-3">Do you offer annual pricing?</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Yes, we offer annual plans with a 15% discount compared to monthly billing. Contact our sales team for more information on annual pricing options.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-bold mb-3">What happens if I exceed my monthly execution limit?</h3>
              <p className="text-slate-600 dark:text-slate-400">
                If you exceed your monthly execution limit, you will be charged an overage fee based on your plan. For the Starter plan, additional executions are $0.05 each. For the Professional plan, additional executions are $0.03 each. We'll notify you when you reach 80% of your limit so you can upgrade if needed.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-bold mb-3">Do you offer a free trial?</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Yes, we offer a 14-day free trial for our Starter and Professional plans. No credit card is required to start your trial. You can explore the platform and test your use cases before committing to a paid plan.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-violet-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Button size="lg" variant="secondary" className="px-8" asChild>
            <Link href="/register">
              Start Your Free Trial
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;