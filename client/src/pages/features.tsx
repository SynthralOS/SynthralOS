import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Footer } from '@/components/landing/Footer';
import { 
  LucideArrowRight, 
  LucideBrain, 
  LucideCode, 
  LucideDatabase, 
  LucideFileSearch, 
  LucideGanttChart, 
  LucideGlobe, 
  LucideLock, 
  LucideNetwork, 
  LucideSettings2, 
  LucideUsers, 
  LucideWand2 
} from 'lucide-react';

const featureCategories = [
  {
    title: "Core Capabilities",
    features: [
      {
        icon: <LucideWand2 className="h-8 w-8" />,
        title: "Visual Workflow Builder",
        description: "Build complex workflows with our intuitive drag-and-drop interface. Connect components, configure behavior, and create end-to-end automation without writing code."
      },
      {
        icon: <LucideBrain className="h-8 w-8" />,
        title: "Multi-Agent Architecture",
        description: "Harness the power of specialized AI agents that work together to accomplish complex tasks. Agents can reason, research, write, analyze, and make decisions with human-like intelligence."
      },
      {
        icon: <LucideFileSearch className="h-8 w-8" />,
        title: "Document Intelligence",
        description: "Process documents with advanced OCR that automatically selects the right engine based on document type. Extract data from structured forms, handwritten notes, and complex tables with high accuracy."
      }
    ]
  },
  {
    title: "Advanced Capabilities",
    features: [
      {
        icon: <LucideCode className="h-8 w-8" />,
        title: "Web Scraping & Data Extraction",
        description: "Extract data from websites with our powerful scraping tools. Handle complex websites with authentication, dynamic content, and custom navigation patterns."
      },
      {
        icon: <LucideGlobe className="h-8 w-8" />,
        title: "Social Media Monitoring",
        description: "Track brand mentions, competitor activity, and industry trends across social platforms. Set up alerts for relevant conversations and automate responses."
      },
      {
        icon: <LucideDatabase className="h-8 w-8" />,
        title: "Data Enrichment & Analysis",
        description: "Enhance your data with information from external sources, identify patterns, and generate insights automatically with AI-powered analysis."
      }
    ]
  },
  {
    title: "Integration & Connectivity",
    features: [
      {
        icon: <LucideNetwork className="h-8 w-8" />,
        title: "300+ Pre-built Connectors",
        description: "Connect to your existing systems with our extensive library of pre-built integrations for popular platforms, databases, and services."
      },
      {
        icon: <LucideSettings2 className="h-8 w-8" />,
        title: "API Integration & Webhooks",
        description: "Connect to any system with our flexible API integration capabilities. Set up webhooks to trigger workflows based on external events."
      },
      {
        icon: <LucideGanttChart className="h-8 w-8" />,
        title: "LangGraph Integration",
        description: "Build sophisticated AI applications with LangGraph integration that enables complex, multi-step reasoning and planning capabilities."
      }
    ]
  },
  {
    title: "Enterprise Features",
    features: [
      {
        icon: <LucideLock className="h-8 w-8" />,
        title: "Enterprise-Grade Security",
        description: "Rest easy with SOC 2 Type II compliance, end-to-end encryption, role-based access controls, and comprehensive audit logging."
      },
      {
        icon: <LucideUsers className="h-8 w-8" />,
        title: "Team Collaboration",
        description: "Enable seamless collaboration with shared workflows, version control, comments, and approval processes for team-based automation development."
      },
      {
        icon: <LucideSettings2 className="h-8 w-8" />,
        title: "White Labeling & Customization",
        description: "Customize the platform with your brand elements and tailor the user experience to meet your organization's specific requirements."
      }
    ]
  }
];

const FeaturesPage = () => {
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
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Feature-rich Automation <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">Platform</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              Discover the comprehensive capabilities that make SynthralOS the most powerful AI workflow automation platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Categories Sections */}
      {featureCategories.map((category, categoryIndex) => (
        <section 
          key={categoryIndex}
          className={`py-20 ${categoryIndex % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900'}`}
        >
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">{category.title}</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {category.features.map((feature, featureIndex) => (
                <motion.div
                  key={featureIndex}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: featureIndex * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="mb-5 text-violet-600 dark:text-violet-400">{feature.icon}</div>
                      <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4 flex-grow">{feature.description}</p>
                      <Link href={`/feature/${feature.title.toLowerCase().replace(/\s+/g, '-')}`} className="inline-flex items-center text-violet-600 dark:text-violet-400 font-medium mt-2">
                        <span>Learn more</span>
                        <LucideArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-violet-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to experience these features?</h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto">
            Start your 14-day free trial today and see how SynthralOS can transform your business processes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8 bg-white text-violet-700 hover:bg-slate-100" asChild>
              <Link href="/register">
                Start Free Trial
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 text-white border-white hover:bg-white/10" asChild>
              <Link href="/demo">
                Watch Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturesPage;