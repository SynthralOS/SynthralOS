import React from 'react';
import { motion } from 'framer-motion';
import { LucideCheck, LucideX } from 'lucide-react';

interface ComparisonFeature {
  feature: string;
  synthral: boolean;
  traditional: boolean;
  basic: boolean;
}

export const ComparisonSection: React.FC = () => {
  const comparisonData: ComparisonFeature[] = [
    { 
      feature: "Visual Workflow Builder", 
      synthral: true, 
      traditional: true, 
      basic: true 
    },
    { 
      feature: "Multi-Agent Architecture", 
      synthral: true, 
      traditional: false, 
      basic: false 
    },
    { 
      feature: "20+ Agent Protocols", 
      synthral: true, 
      traditional: false, 
      basic: false 
    },
    { 
      feature: "OCR with Engine Switching", 
      synthral: true, 
      traditional: false, 
      basic: false 
    },
    { 
      feature: "Social Media Monitoring", 
      synthral: true, 
      traditional: true, 
      basic: false 
    },
    { 
      feature: "Advanced Web Scraping", 
      synthral: true, 
      traditional: true, 
      basic: false 
    },
    { 
      feature: "300+ Pre-built Connectors", 
      synthral: true, 
      traditional: true, 
      basic: false 
    },
    { 
      feature: "API Integration", 
      synthral: true, 
      traditional: true, 
      basic: true 
    },
    { 
      feature: "Vector Database", 
      synthral: true, 
      traditional: false, 
      basic: false 
    },
    { 
      feature: "Recursive Planning", 
      synthral: true, 
      traditional: false, 
      basic: false 
    },
    { 
      feature: "Self-Healing Workflows", 
      synthral: true, 
      traditional: false, 
      basic: false 
    },
    { 
      feature: "Enterprise Security", 
      synthral: true, 
      traditional: true, 
      basic: false 
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
              How We <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Compare</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              See how SynthralOS stacks up against traditional automation platforms and basic AI tools.
            </p>
          </motion.div>
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto overflow-x-auto"
        >
          <div className="min-w-[768px]">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 mb-6 text-center font-bold">
              <div className="text-left">Features</div>
              <div>
                <div className="bg-gradient-to-r from-blue-600 to-violet-600 text-white py-3 px-4 rounded-lg mb-2">SynthralOS</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Next-Gen AI Platform</div>
              </div>
              <div>
                <div className="bg-slate-200 dark:bg-slate-700 py-3 px-4 rounded-lg mb-2">Traditional</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Automation Platforms</div>
              </div>
              <div>
                <div className="bg-slate-100 dark:bg-slate-800 py-3 px-4 rounded-lg mb-2">Basic</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">AI Tools</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="space-y-4">
              {comparisonData.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="grid grid-cols-4 gap-4 py-4 border-b border-slate-100 dark:border-slate-700 items-center"
                >
                  <div className="font-medium">{item.feature}</div>
                  <div className="text-center">
                    {item.synthral ? (
                      <div className="flex justify-center">
                        <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                          <LucideCheck className="h-4 w-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                          <LucideX className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    {item.traditional ? (
                      <div className="flex justify-center">
                        <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                          <LucideCheck className="h-4 w-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                          <LucideX className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    {item.basic ? (
                      <div className="flex justify-center">
                        <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                          <LucideCheck className="h-4 w-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                          <LucideX className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Additional Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-12 text-center"
        >
          <p className="text-slate-600 dark:text-slate-400">
            While other platforms may offer some similar functionality, SynthralOS provides the most comprehensive set of AI automation capabilities in a single, integrated platform.
          </p>
        </motion.div>
      </div>
    </section>
  );
};