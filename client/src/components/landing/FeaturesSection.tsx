import React from 'react';
import { motion } from 'framer-motion';
import { 
  Aperture, 
  Brain, 
  Code, 
  Database, 
  FileSearch, 
  GanttChart, 
  Globe, 
  Lock, 
  Magnet, 
  Network, 
  Bot, 
  Settings2 
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-700"
    >
      <div className="mb-4 text-violet-600 dark:text-violet-400">{icon}</div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400">{description}</p>
    </motion.div>
  );
};

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Brain className="h-8 w-8" />,
      title: "Multi-Agent Architecture",
      description: "Deploy specialized AI agents that work together to solve complex problems autonomously, with built-in coordination and collaboration capabilities."
    },
    {
      icon: <GanttChart className="h-8 w-8" />,
      title: "Visual Workflow Builder",
      description: "Design sophisticated automation workflows with our intuitive drag-and-drop interface, connecting components and configuring behavior without code."
    },
    {
      icon: <FileSearch className="h-8 w-8" />,
      title: "Advanced OCR Processing",
      description: "Intelligently process documents with our engine switching technology that automatically selects the optimal OCR approach based on document type."
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Social Media Monitoring",
      description: "Track brand mentions, competitor activity, and industry trends across major social platforms with customizable alerts and automated responses."
    },
    {
      icon: <Code className="h-8 w-8" />,
      title: "Comprehensive Web Scraping",
      description: "Extract data from any website with powerful scraping tools that handle authentication, dynamic content, and complex navigation patterns."
    },
    {
      icon: <Network className="h-8 w-8" />,
      title: "300+ Pre-built Connectors",
      description: "Integrate with your existing tools through our extensive library of pre-built connectors for popular platforms, databases, and services."
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "Vector Database Management",
      description: "Store, query, and manage embeddings efficiently with built-in vector database capabilities, optimized for AI-powered search and retrieval."
    },
    {
      icon: <Settings2 className="h-8 w-8" />,
      title: "API Integration",
      description: "Connect to any system with flexible API integration capabilities and webhooks that trigger workflows based on external events."
    },
    {
      icon: <Lock className="h-8 w-8" />,
      title: "Enterprise-Grade Security",
      description: "Protect your data with SOC 2 compliance, end-to-end encryption, role-based access controls, and comprehensive audit logging."
    },
    {
      icon: <Magnet className="h-8 w-8" />,
      title: "Recursive Planning",
      description: "Enable agents to break down complex tasks into subtasks, with dynamic adaptation and error recovery for reliable execution."
    },
    {
      icon: <Bot className="h-8 w-8" />,
      title: "Self-Healing Workflows",
      description: "Build resilient processes with automatic error detection and recovery mechanisms that adapt to changing conditions."
    },
    {
      icon: <Aperture className="h-8 w-8" />,
      title: "Workflow Visualization",
      description: "Monitor execution progress in real-time with interactive visualizations showing agent activities, task completions, and data flows."
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
              Powerful Features for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Intelligent Automation</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              SynthralOS combines cutting-edge AI technologies with intuitive interfaces to revolutionize your business processes.
            </p>
          </motion.div>
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};