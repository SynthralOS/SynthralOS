import React from 'react';
import { motion } from 'framer-motion';
import { LucideCheck } from 'lucide-react';

export const WhyUsSection: React.FC = () => {
  const benefits = [
    {
      title: "Unmatched AI Capabilities",
      points: [
        "20+ AI agent protocols including AgentGPT, LangChain, AutoGPT, MetaGPT, CrewAI and more",
        "Revolutionary multi-agent architecture with specialized roles and agent-to-agent communication",
        "Recursive planning and fallback strategies for complex task handling",
        "Self-healing workflows with automatic error recovery"
      ]
    },
    {
      title: "Seamless Integration",
      points: [
        "Connect to over 300 services with pre-built connectors",
        "Comprehensive API integration capabilities with OAuth handling",
        "Built-in OCR with intelligent engine switching based on document type",
        "Advanced web scraping tools that handle complex websites"
      ]
    },
    {
      title: "Enterprise-Ready",
      points: [
        "SOC 2 Type II compliant infrastructure",
        "Fine-grained role-based access controls",
        "Comprehensive audit logging and monitoring",
        "Available as managed cloud or self-hosted deployment"
      ]
    }
  ];

  return (
    <section className="py-20 bg-white dark:bg-slate-800">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">SynthralOS</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Our platform stands apart with unmatched capabilities, flexibility, and enterprise-grade security.
            </p>
          </motion.div>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-10">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-gradient-to-r from-blue-600 to-violet-600 h-2"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
                <ul className="space-y-3">
                  {benefit.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start">
                      <span className="mr-2 text-green-500 flex-shrink-0 mt-1">
                        <LucideCheck className="h-5 w-5" />
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "20+", label: "AI Agent Protocols" },
            { value: "300+", label: "Integrated Services" },
            { value: "5x", label: "Faster Implementation" },
            { value: "99.9%", label: "Uptime SLA" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 mb-2">
                {stat.value}
              </div>
              <div className="text-slate-600 dark:text-slate-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-16 bg-slate-50 dark:bg-slate-900 p-10 rounded-2xl text-center max-w-4xl mx-auto"
        >
          <div className="inline-block rounded-full bg-gradient-to-r from-blue-600 to-violet-600 p-1 mb-6">
            <div className="bg-white dark:bg-slate-900 h-16 w-16 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"></path>
                <path d="M19 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"></path>
              </svg>
            </div>
          </div>
          <blockquote className="text-xl text-slate-700 dark:text-slate-300 mb-4">
            SynthralOS has revolutionized our business processes. We've automated workflows that previously took days to complete, and the AI agents handle complex tasks with incredible accuracy. The ROI has been phenomenal.
          </blockquote>
          <div className="font-semibold">Sarah Chen</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">CTO, TechForward Inc.</div>
        </motion.div>
      </div>
    </section>
  );
};