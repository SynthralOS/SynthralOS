import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';

const TermsPage = () => {
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
      <section className="py-12 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Last updated: May 1, 2025
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto prose dark:prose-invert prose-slate">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2>1. Introduction</h2>
              <p>
                Welcome to SynthralOS. These Terms of Service ("Terms") govern your access to and use of the SynthralOS platform, including any websites, mobile applications, and services offered by SynthralOS ("Service").
              </p>
              <p>
                By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
              </p>

              <h2>2. Accounts</h2>
              <p>
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
              </p>
              <p>
                You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
              </p>

              <h2>3. Subscription and Payments</h2>
              <p>
                Some features of the Service require a subscription. By subscribing to the Service, you agree to pay the subscription fees as described on our pricing page or during the subscription process.
              </p>
              <p>
                We reserve the right to change our subscription fees at any time. If we change our fees, we will provide notice of the change on the website or by email, at our discretion.
              </p>
              <p>
                All payments are processed by our payment processor, Stripe. By subscribing to the Service, you agree to Stripe's terms of service and privacy policy.
              </p>

              <h2>4. Use of the Service</h2>
              <p>
                You may use the Service only for lawful purposes and in accordance with these Terms. You agree not to use the Service:
              </p>
              <ul>
                <li>In any way that violates any applicable federal, state, local, or international law or regulation</li>
                <li>To engage in any activity that threatens the security, integrity, or availability of the Service</li>
                <li>To attempt to bypass or circumvent any security measures of the Service</li>
                <li>To upload or transmit any material that contains viruses, worms, or any other harmful code</li>
                <li>To engage in any activity that interferes with or disrupts the Service</li>
              </ul>

              <h2>5. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are and will remain the exclusive property of SynthralOS and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
              </p>
              <p>
                Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of SynthralOS.
              </p>

              <h2>6. User Content</h2>
              <p>
                When you upload content to the Service or otherwise submit material, you grant SynthralOS a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute your content in any existing or future media.
              </p>
              <p>
                You represent and warrant that your content does not violate copyright laws or any other third-party rights and that you own or control all rights to the content.
              </p>

              <h2>7. Data Security and Privacy</h2>
              <p>
                Your use of the Service is also governed by our Privacy Policy, which is incorporated by reference into these Terms. Please review our Privacy Policy to understand our practices regarding your personal data.
              </p>

              <h2>8. Limitation of Liability</h2>
              <p>
                In no event shall SynthralOS, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
              </p>
              <ul>
                <li>Your access to or use of or inability to access or use the Service</li>
                <li>Any conduct or content of any third party on the Service</li>
                <li>Any content obtained from the Service</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
              </ul>

              <h2>9. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
              </p>

              <h2>10. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <ul>
                <li>By email: legal@synthralos.com</li>
                <li>By mail: SynthralOS Legal Team, 123 Tech Lane, San Francisco, CA 94105, USA</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsPage;