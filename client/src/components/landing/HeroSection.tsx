import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight,
  BrainCircuit, 
  LayoutDashboard, 
  Monitor, 
  Users,
  Sparkles,
  Bot,
  Workflow,
  Zap,
  Lightbulb
} from 'lucide-react';
import { NavBar } from './NavBar';

export const HeroSection: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Futuristic Background */}
      <div className="absolute inset-0 z-0">
        {/* Animated gradients */}
        <div className="absolute right-0 top-0 w-[80%] h-[80%] bg-gradient-to-b from-violet-500/20 to-transparent rounded-bl-full transform -translate-y-1/4 translate-x-1/4 blur-3xl animate-pulse"></div>
        <div className="absolute left-0 bottom-0 w-[60%] h-[60%] bg-gradient-to-t from-blue-500/20 to-transparent rounded-tr-full transform translate-y-1/4 -translate-x-1/4 blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute left-1/3 top-1/4 w-[25%] h-[25%] bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        
        {/* Digital particles effect (decorative dots) */}
        <div className="absolute inset-0 opacity-20 dark:opacity-30">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-blue-600 to-violet-600"
              style={{
                width: Math.random() * 6 + 2 + 'px',
                height: Math.random() * 6 + 2 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                opacity: Math.random() * 0.5 + 0.3,
                animation: `float ${Math.random() * 10 + 15}s linear infinite`,
                animationDelay: `${Math.random() * 10}s`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Navbar */}
      <NavBar />
      
      {/* Hero Content */}
      <div className="relative z-10 container mx-auto px-4 pt-24 pb-32 md:pt-32 md:pb-40">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4 mr-2" />
              <span>Next-Gen AI Automation</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Intelligent Workflow <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 animate-gradient">Automation</span> for the AI Age
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-xl leading-relaxed">
              Build, deploy, and orchestrate sophisticated AI-powered automation workflows without code. Connect data sources, deploy intelligent agents, and transform your business operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 hover:shadow-lg hover:shadow-violet-600/20 transition-all duration-300" 
                asChild
              >
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-300"
                asChild
              >
                <Link href="/demo">
                  Request Demo
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center text-sm text-slate-500 dark:text-slate-400">
              <div className="flex -space-x-2 mr-3">
                {[1, 2, 3, 4].map((index) => (
                  <div 
                    key={index} 
                    className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-gradient-to-br from-blue-500 to-violet-600"
                    style={{
                      animationDelay: `${index * 0.1}s`,
                    }}
                  ></div>
                ))}
              </div>
              <span>Trusted by 1000+ companies globally</span>
            </div>
            
            <div className="mt-8 flex flex-wrap gap-5">
              <div className="flex items-center text-sm">
                <Zap className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-slate-600 dark:text-slate-300">20+ Agent Protocols</span>
              </div>
              <div className="flex items-center text-sm">
                <Bot className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-slate-600 dark:text-slate-300">Multi-Agent Architecture</span>
              </div>
              <div className="flex items-center text-sm">
                <Workflow className="h-4 w-4 text-violet-500 mr-2" />
                <span className="text-slate-600 dark:text-slate-300">Self-Healing Workflows</span>
              </div>
            </div>
          </motion.div>
          
          {/* Right Column - Animation/Image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden md:block"
          >
            <div className="relative">
              {/* Dashboard Panel */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-xl border border-slate-200/60 dark:border-slate-700/60 p-4 left-0 top-20 w-56 h-auto z-10"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-2">
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Workflows</span>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full mb-1 animate-pulse"></div>
                <div className="h-1 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full mb-1"></div>
                <div className="h-1 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </motion.div>
              
              {/* Agent Panel */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="absolute bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-xl border border-slate-200/60 dark:border-slate-700/60 p-4 right-0 top-0 w-56 h-auto z-10"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 mr-2">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <span className="font-medium">AI Agents</span>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full mb-1 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                <div className="h-1 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full mb-1"></div>
                <div className="h-1 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </motion.div>
              
              {/* Main Dashboard Image */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="rounded-xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-sm"
              >
                <div className="bg-white/90 dark:bg-slate-800/90 p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  </div>
                  <div className="w-2/3 bg-slate-100 dark:bg-slate-700 h-6 rounded-md"></div>
                  <div></div>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 h-80">
                  <div className="grid grid-cols-4 gap-3 p-4 h-full">
                    <div className="col-span-1 space-y-3">
                      <div className="h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md border border-slate-200/80 dark:border-slate-700/80"></div>
                      <div className="h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md border border-slate-200/80 dark:border-slate-700/80"></div>
                      <div className="h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md border border-slate-200/80 dark:border-slate-700/80"></div>
                      <div className="h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md border border-slate-200/80 dark:border-slate-700/80"></div>
                      <div className="flex-grow bg-gradient-to-b from-blue-100 to-violet-100 dark:from-blue-900/20 dark:to-violet-900/20 rounded-md border border-slate-200/80 dark:border-slate-700/80"></div>
                    </div>
                    <div className="col-span-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-200/80 dark:border-slate-700/80 p-4">
                      <div className="h-8 mb-4 w-48 bg-slate-100 dark:bg-slate-700 rounded-md"></div>
                      <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-24 bg-gradient-to-br from-slate-50 to-white dark:from-slate-700 dark:to-slate-800 rounded-md border border-slate-200 dark:border-slate-600 p-3 shadow-sm">
                            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-600 rounded-md mb-2"></div>
                            <div className="h-3 w-full bg-slate-200 dark:bg-slate-600 rounded-md mb-1"></div>
                            <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-600 rounded-md"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Social Monitoring Panel */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="absolute bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-xl border border-slate-200/60 dark:border-slate-700/60 p-4 left-20 bottom-0 w-56 h-auto z-10"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-2">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Monitoring</span>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-1 animate-pulse" style={{animationDelay: '1s'}}></div>
                <div className="h-1 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full mb-1"></div>
                <div className="h-1 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </motion.div>
              
              {/* Collaboration Panel */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="absolute bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-xl border border-slate-200/60 dark:border-slate-700/60 p-4 right-20 bottom-20 w-56 h-auto z-10"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-2">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Team</span>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-1 animate-pulse" style={{animationDelay: '1.5s'}}></div>
                <div className="h-1 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full mb-1"></div>
                <div className="h-1 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </motion.div>
              
              {/* Ideas Panel */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.4 }}
                className="absolute bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-xl border border-slate-200/60 dark:border-slate-700/60 p-4 right-10 bottom-0 w-48 h-auto z-10"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-md bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mr-2">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Insights</span>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full mb-1 animate-pulse" style={{animationDelay: '2s'}}></div>
                <div className="h-1 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full mb-1"></div>
                <div className="h-1 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Decorative Wave */}
      <div className="absolute bottom-0 left-0 right-0 h-20 overflow-hidden z-0">
        <svg viewBox="0 0 1440 120" className="absolute bottom-0 w-full h-auto fill-white dark:fill-slate-900 opacity-10">
          <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,53.3C1120,53,1280,75,1360,85.3L1440,96L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
        </svg>
      </div>
    </div>
  );
};