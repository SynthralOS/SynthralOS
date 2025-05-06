import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';
import { 
  RocketIcon, 
  GitBranchIcon, 
  CalendarIcon, 
  MapPinIcon,
  CheckCircleIcon,
  CircleIcon,
  BadgeCheckIcon,
  StarIcon,
  LightbulbIcon,
  BrainCircuitIcon
} from 'lucide-react';

const RoadmapPage = () => {
  // Roadmap items with status
  const roadmapItems = [
    {
      quarter: 'Q2 2025',
      version: 'v1.0',
      title: 'Initial Platform Launch',
      description: 'Core platform functionality including visual workflow builder, multi-agent architecture, and initial set of 50+ connectors.',
      features: [
        { name: 'Visual Workflow Builder', status: 'completed' },
        { name: 'Multi-Agent Architecture', status: 'completed' },
        { name: '50+ Pre-built Connectors', status: 'completed' },
        { name: 'Social Media Monitoring', status: 'completed' },
        { name: 'Advanced OCR Processing', status: 'completed' },
      ],
      status: 'completed'
    },
    {
      quarter: 'Q3 2025',
      version: 'v1.5',
      title: 'Enterprise Capabilities',
      description: 'Enhanced enterprise features including role-based access controls, audit logging, and SSO integration.',
      features: [
        { name: 'Role-based Access Controls', status: 'in-progress' },
        { name: 'Comprehensive Audit Logging', status: 'in-progress' },
        { name: 'SSO Integration', status: 'in-progress' },
        { name: 'SOC 2 Compliance', status: 'planned' },
        { name: 'Enterprise SLAs', status: 'planned' },
      ],
      status: 'in-progress'
    },
    {
      quarter: 'Q4 2025',
      version: 'v2.0',
      title: 'Advanced Agent Frameworks',
      description: 'Expanded agent capabilities with support for 20+ frameworks and advanced recursive planning.',
      features: [
        { name: 'Support for 20+ Agent Frameworks', status: 'planned' },
        { name: 'Recursive Planning Capabilities', status: 'planned' },
        { name: 'Enhanced Self-healing Workflows', status: 'planned' },
        { name: 'Advanced Vector DB Integration', status: 'planned' },
        { name: 'Custom Agent Development SDK', status: 'planned' },
      ],
      status: 'planned'
    },
    {
      quarter: 'Q1 2026',
      version: 'v2.5',
      title: 'Industry Solutions',
      description: 'Industry-specific solution templates and enhanced collaboration features.',
      features: [
        { name: 'Healthcare Solution Templates', status: 'planned' },
        { name: 'Financial Services Workflows', status: 'planned' },
        { name: 'Retail & E-commerce Automation', status: 'planned' },
        { name: 'Legal Document Processing', status: 'planned' },
        { name: 'Cross-org Collaboration Tools', status: 'planned' },
      ],
      status: 'planned'
    },
    {
      quarter: 'Q2 2026',
      version: 'v3.0',
      title: 'Advanced AI Capabilities',
      description: 'Next-generation AI capabilities with enhanced reasoning and continuous learning.',
      features: [
        { name: 'Continuous Learning Agents', status: 'planned' },
        { name: 'Advanced Reasoning Framework', status: 'planned' },
        { name: 'Natural Language Workflow Creation', status: 'planned' },
        { name: 'Autonomous Workflow Optimization', status: 'planned' },
        { name: 'AI-driven Workflow Recommendations', status: 'planned' },
      ],
      status: 'planned'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <CircleIcon className="h-5 w-5 text-blue-500" />;
      case 'planned':
        return <CircleIcon className="h-5 w-5 text-slate-400" />;
      default:
        return <CircleIcon className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'planned':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 mb-6">
              <RocketIcon className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Product Roadmap</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Our vision for the future of SynthralOS and the exciting features on the horizon
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Introduction */}
              <div className="mb-12 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 p-8 rounded-xl border border-violet-100 dark:border-violet-800/30">
                <h2 className="text-2xl font-bold mb-4 text-violet-700 dark:text-violet-300">Our Vision</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-6">
                  At SynthralOS, we're building the future of AI-powered automation. Our roadmap reflects our commitment 
                  to innovation and our drive to create a platform that enables businesses to harness the full potential of AI.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex flex-col items-center p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg backdrop-blur-sm">
                    <BrainCircuitIcon className="h-8 w-8 text-violet-500 mb-2" />
                    <h3 className="font-semibold text-center">Intelligence</h3>
                    <p className="text-sm text-center text-slate-600 dark:text-slate-400">Smarter agents with enhanced reasoning capabilities</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg backdrop-blur-sm">
                    <GitBranchIcon className="h-8 w-8 text-blue-500 mb-2" />
                    <h3 className="font-semibold text-center">Integration</h3>
                    <p className="text-sm text-center text-slate-600 dark:text-slate-400">Seamless connectivity with your entire tech stack</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg backdrop-blur-sm">
                    <LightbulbIcon className="h-8 w-8 text-amber-500 mb-2" />
                    <h3 className="font-semibold text-center">Innovation</h3>
                    <p className="text-sm text-center text-slate-600 dark:text-slate-400">Pioneering new approaches to workflow automation</p>
                  </div>
                </div>
              </div>

              {/* Roadmap Timeline */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-8 flex items-center">
                  <CalendarIcon className="mr-2 h-6 w-6 text-blue-500" />
                  Release Timeline
                </h2>
                
                <div className="space-y-8">
                  {roadmapItems.map((item, index) => (
                    <div key={index} className="relative">
                      {/* Timeline line */}
                      {index < roadmapItems.length - 1 && (
                        <div className={`absolute left-6 top-8 bottom-0 w-0.5 ${
                          item.status === 'completed' ? 'bg-green-200 dark:bg-green-800' : 
                          item.status === 'in-progress' ? 'bg-blue-200 dark:bg-blue-800' : 
                          'bg-slate-200 dark:bg-slate-700'
                        }`}></div>
                      )}
                      
                      {/* Timeline item */}
                      <div className="flex">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 z-10">
                          {getStatusIcon(item.status)}
                        </div>
                        
                        <div className="ml-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex-grow shadow-sm hover:shadow transition-shadow">
                          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.quarter}</span>
                              <h3 className="text-xl font-bold">{item.title}</h3>
                            </div>
                            <div>
                              <span className={`text-xs font-medium py-1 px-2 rounded-full ${getStatusClass(item.status)} capitalize`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="text-slate-600 dark:text-slate-400 mb-4">{item.description}</p>
                            <div className="space-y-2">
                              {item.features.map((feature, featureIndex) => (
                                <div key={featureIndex} className="flex items-center">
                                  {getStatusIcon(feature.status)}
                                  <span className={`ml-2 ${
                                    feature.status === 'completed' ? 'text-slate-900 dark:text-white' : 
                                    feature.status === 'in-progress' ? 'text-slate-900 dark:text-white' : 
                                    'text-slate-500 dark:text-slate-400'
                                  }`}>
                                    {feature.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Future Plans & Community Input */}
              <div className="mb-12 grid md:grid-cols-2 gap-8">
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <StarIcon className="h-5 w-5 text-yellow-500 mr-2" />
                    Beyond the Roadmap
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Our long-term vision extends beyond this roadmap. We're exploring advanced areas such as:
                  </p>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                    <li className="flex items-start">
                      <BadgeCheckIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <span>Autonomous agent swarms with emergent intelligence</span>
                    </li>
                    <li className="flex items-start">
                      <BadgeCheckIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <span>Enhanced multimodal capabilities across all platforms</span>
                    </li>
                    <li className="flex items-start">
                      <BadgeCheckIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <span>Advanced knowledge graph integration for decision making</span>
                    </li>
                    <li className="flex items-start">
                      <BadgeCheckIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <span>Real-time collaboration with human-AI teaming</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <MapPinIcon className="h-5 w-5 text-blue-500 mr-2" />
                    Help Shape Our Future
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    We believe in building in the open with our community. Your feedback directly influences our roadmap.
                  </p>
                  <div className="space-y-4">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                      <Link href="/contact">Submit Feature Request</Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <a href="https://github.com/synthralos/feedback" target="_blank" rel="noopener noreferrer">
                        View Public Roadmap on GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-2">How often is the roadmap updated?</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      We update our public roadmap quarterly. However, we may make adjustments as we gather feedback and market conditions evolve.
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-2">Can I request features not on the roadmap?</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Absolutely! We encourage our community to share their ideas and needs. Many of our best features come from customer requests.
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-2">Will pricing change with new features?</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      We strive to provide excellent value. While major new capabilities may introduce new pricing tiers, existing customers will always be grandfathered into their current plans.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RoadmapPage;