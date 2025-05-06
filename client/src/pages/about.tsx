import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';

const AboutPage = () => {
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About SynthralOS</h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              We're building the future of intelligent automation
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                At SynthralOS, our mission is to democratize AI automation by creating a platform that empowers businesses of all sizes to harness the full potential of artificial intelligence without requiring specialized technical expertise.
              </p>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                We believe that the next wave of productivity gains will come from intelligent automation that can understand, reason, and execute complex business processes. Our platform combines cutting-edge AI technologies with a user-friendly interface to make this vision a reality.
              </p>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                By removing the technical barriers to advanced automation, we're helping organizations save time, reduce costs, and focus on what matters most - innovation and growth.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="mt-16"
            >
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                SynthralOS was founded in 2023 by a team of AI researchers and enterprise software veterans who saw a gap in the market: while AI capabilities were advancing rapidly, most businesses couldn't effectively deploy these technologies due to technical complexity and resource constraints.
              </p>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                We set out to build a platform that would bridge this gap, making advanced AI accessible through a visual workflow builder that anyone could use. After months of development and collaboration with early customers, we launched SynthralOS to bring enterprise-grade AI automation to organizations worldwide.
              </p>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Today, SynthralOS is used by companies across industries to automate document processing, customer interactions, research, data analysis, and much more. We're continuously innovating to push the boundaries of what's possible with AI automation.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="mt-16"
            >
              <h2 className="text-3xl font-bold mb-6">Our Values</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-3">Innovation</h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    We're constantly pushing the boundaries of what's possible with AI, exploring new approaches and technologies to deliver ever more powerful automation capabilities.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-3">Accessibility</h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    We believe advanced technology should be accessible to everyone. We design our platform to be intuitive and user-friendly, regardless of technical expertise.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-3">Security</h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    We prioritize the security and privacy of our customers' data, implementing robust safeguards and maintaining compliance with industry standards.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-3">Customer Success</h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    We measure our success by our customers' success. We're committed to supporting our users in achieving their automation goals and realizing tangible business value.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-violet-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Join us on our mission</h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto">
            Experience the power of SynthralOS and take your business automation to the next level.
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

export default AboutPage;