import React from 'react';
import { motion } from 'framer-motion';
import { LucideArrowRight } from 'lucide-react';

interface TimelineItemProps {
  date: string;
  title: string;
  description: string;
  index: number;
  isLast?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ date, title, description, index, isLast = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="relative pl-8 pb-8"
    >
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-3 top-3 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-violet-500"></div>
      )}
      
      {/* Circle */}
      <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full"></div>
      </div>
      
      {/* Content */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="text-sm font-medium text-violet-600 dark:text-violet-400 mb-2">{date}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </motion.div>
  );
};

export const TimelineSection: React.FC = () => {
  const workflowSteps = [
    {
      date: "Step 1",
      title: "Create Your Workflow",
      description: "Start with our visual drag-and-drop workflow builder to design your automation process with a simple, intuitive interface."
    },
    {
      date: "Step 2",
      title: "Select AI Agents",
      description: "Choose from 20+ agent frameworks like MetaGPT, CrewAI, and AutoGen to handle specific tasks in your workflow."
    },
    {
      date: "Step 3",
      title: "Configure Data Sources",
      description: "Connect data sources through our 300+ integrations, including social media monitoring and advanced OCR capabilities."
    },
    {
      date: "Step 4",
      title: "Define Logic & Rules",
      description: "Create conditional paths, loops, and decision points with intelligent routing based on content types."
    },
    {
      date: "Step 5",
      title: "Test & Refine",
      description: "Simulate your workflow with real-time visualization, tracking every step of the process to ensure optimal performance."
    },
    {
      date: "Step 6",
      title: "Deploy & Monitor",
      description: "Launch your automation with built-in monitoring, self-healing capabilities, and detailed analytics for continuous improvement."
    }
  ];

  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-900">
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
              How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Works</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              SynthralOS provides a seamless end-to-end workflow to build, deploy, and manage sophisticated AI automation processes.
            </p>
          </motion.div>
        </div>
        
        {/* Timeline */}
        <div className="max-w-3xl mx-auto">
          {workflowSteps.map((step, index) => (
            <TimelineItem
              key={index}
              date={step.date}
              title={step.title}
              description={step.description}
              index={index}
              isLast={index === workflowSteps.length - 1}
            />
          ))}
        </div>
        
        {/* Get Started */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-12 text-center"
        >
          <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
            Experience the power of intelligent automation with SynthralOS. Create your first workflow in minutes and transform how your organization handles complex processes.
          </p>
          <div className="flex justify-center space-x-4">
            <a href="/demo" className="inline-flex items-center text-white bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 rounded-md font-medium">
              <span>Try Live Demo</span>
            </a>
            <a href="/templates" className="inline-flex items-center text-violet-600 dark:text-violet-400 font-medium">
              <span>View Workflow Templates</span>
              <LucideArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};