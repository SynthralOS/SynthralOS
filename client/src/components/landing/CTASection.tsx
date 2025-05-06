import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LucideArrowRight } from 'lucide-react';

export const CTASection: React.FC = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 to-violet-700 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main CTA Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Business with Intelligent Automation?
            </h2>
            <p className="text-xl opacity-90 mb-10 max-w-3xl mx-auto">
              Join thousands of companies already using SynthralOS to automate complex workflows, 
              improve efficiency, and unlock new possibilities with AI.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-violet-700 hover:bg-slate-100 px-6"
                asChild
              >
                <Link href="/register">
                  Start Your Free Trial
                  <LucideArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-white border-white hover:bg-white/10 px-6"
                asChild
              >
                <Link href="/demo">
                  Request Demo
                </Link>
              </Button>
            </div>
          </motion.div>
          
          {/* Customer Testimonials or Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-16 grid sm:grid-cols-3 gap-8"
          >
            {[
              { stat: "2,500+", label: "Workflows automated" },
              { stat: "85%", label: "Average time saved" },
              { stat: "500+", label: "Active enterprise users" }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold mb-2">{item.stat}</div>
                <div className="opacity-75">{item.label}</div>
              </div>
            ))}
          </motion.div>
          
          {/* No Credit Card + Guarantee */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 flex flex-col md:flex-row gap-6 justify-center items-center"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <span>No credit card required</span>
            </div>
            <div className="hidden md:block w-px h-8 bg-white/30"></div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M9.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
                  <path d="M15.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
                  <path d="M12 16c1.5 0 3-2 3-2H9s1.5 2 3 2z" />
                </svg>
              </div>
              <span>14-day satisfaction guarantee</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};