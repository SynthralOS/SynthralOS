import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';

const CookiesPage = () => {
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
            <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
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
              <h2>What Are Cookies</h2>
              <p>
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.
              </p>
              <p>
                SynthralOS uses cookies to enhance your experience, analyze our traffic, and for security purposes. By using our platform, you consent to the use of cookies as described in this policy.
              </p>

              <h2>Types of Cookies We Use</h2>
              
              <h3>Essential Cookies</h3>
              <p>
                These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account access. You may disable these by changing your browser settings, but this may affect how the website functions.
              </p>
              <ul>
                <li><strong>Session Cookies:</strong> These temporary cookies are erased when you close your browser and do not collect information from your computer. They typically store information in the form of a session identification that does not personally identify the user.</li>
                <li><strong>Authentication Cookies:</strong> These cookies help us identify our users so that when you're logged in, you can access your account information and other personalized features.</li>
                <li><strong>Security Cookies:</strong> These cookies help detect and prevent security risks, such as unauthorized login attempts.</li>
              </ul>

              <h3>Performance and Analytics Cookies</h3>
              <p>
                These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. They help us improve the way our website works.
              </p>
              <ul>
                <li><strong>Analytics Cookies:</strong> We use Google Analytics and other analytics providers to help understand how users engage with our platform. These cookies collect information about your use of our website, including which pages you visit and how you navigate through the site.</li>
                <li><strong>Performance Cookies:</strong> These cookies collect information about how visitors use our website, such as which pages visitors go to most often. They help us improve the website and ensure that users can easily find what they're looking for.</li>
              </ul>

              <h3>Functional Cookies</h3>
              <p>
                These cookies enable our website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.
              </p>
              <ul>
                <li><strong>Preference Cookies:</strong> These cookies remember choices you make to improve your experience, such as your language preference or the region you are in.</li>
                <li><strong>Customization Cookies:</strong> These cookies allow us to remember information that changes the way the website behaves or looks, like your preferred layout or theme.</li>
              </ul>

              <h3>Targeting/Advertising Cookies</h3>
              <p>
                These cookies are used to make advertising messages more relevant to you. They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed, and in some cases selecting advertisements that are based on your interests.
              </p>
              <ul>
                <li><strong>Marketing Cookies:</strong> These cookies help us track the effectiveness of our marketing campaigns and are sometimes used to show you advertisements for our services across the internet.</li>
                <li><strong>Third-party Advertising Cookies:</strong> Some of our pages may contain cookies from third-party services that track the effectiveness of our advertising campaigns.</li>
              </ul>

              <h2>How to Manage Cookies</h2>
              <p>
                Most web browsers allow you to control cookies through their settings. You can usually find these settings in the "options" or "preferences" menu of your browser. You can also use the "help" function in your browser for more information.
              </p>
              <p>
                Note that if you choose to disable cookies, some features of our website may not function correctly.
              </p>
              <p>
                Here are instructions for managing cookies in common browsers:
              </p>
              <ul>
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471" target="_blank" rel="noopener noreferrer">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
              </ul>

              <h2>Third-Party Cookies</h2>
              <p>
                We may use third-party services that use cookies on our website. These third-party cookies are primarily used for analytics, advertising, and functionality purposes. We do not control these third-party cookies and they are subject to the third party's privacy policy.
              </p>
              <p>
                Some of the third-party services we use include:
              </p>
              <ul>
                <li>Google Analytics</li>
                <li>Stripe (for payment processing)</li>
                <li>PostHog (for product analytics)</li>
                <li>Langfuse (for AI observability)</li>
              </ul>

              <h2>Cookie Consent</h2>
              <p>
                When you first visit our website, you will be presented with a cookie banner that allows you to accept or decline non-essential cookies. You can change your preferences at any time by clicking on the "Cookie Settings" link in the footer of our website.
              </p>

              <h2>Updates to this Cookie Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. Any changes will be posted on this page, and if the changes are significant, we will provide a more prominent notice.
              </p>

              <h2>Contact Us</h2>
              <p>
                If you have any questions or concerns about our Cookie Policy, please contact us:
              </p>
              <ul>
                <li>By email: <a href="mailto:privacy@synthralos.com">privacy@synthralos.com</a></li>
                <li>By mail: SynthralOS Privacy Team, 123 Tech Lane, San Francisco, CA 94105, USA</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CookiesPage;