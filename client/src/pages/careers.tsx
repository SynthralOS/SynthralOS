import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';
import { 
  Users, 
  HeartHandshake, 
  Briefcase, 
  Globe, 
  Lightbulb, 
  Coffee,
  Brain,
  Coins,
  Clock,
  Heart
} from 'lucide-react';

const CareersPage = () => {
  // Job postings with departments
  const jobPostings = [
    {
      department: 'Engineering',
      icon: <Brain className="h-5 w-5 text-violet-500" />,
      jobs: [
        {
          title: 'Senior AI Engineer',
          location: 'San Francisco, CA (Remote Friendly)',
          type: 'Full-time',
          description: 'Lead the development of our AI agent frameworks and advanced reasoning systems. Expertise in LLMs, multi-agent architectures, and prompt engineering required.'
        },
        {
          title: 'Full Stack Developer',
          location: 'San Francisco, CA (Remote Friendly)',
          type: 'Full-time',
          description: 'Build and enhance our workflow automation platform. Strong TypeScript, React, and Node.js experience required.'
        },
        {
          title: 'ML Infrastructure Engineer',
          location: 'San Francisco, CA (Remote Friendly)',
          type: 'Full-time',
          description: 'Design and implement infrastructure for training, fine-tuning, and serving machine learning models at scale.'
        }
      ]
    },
    {
      department: 'Product',
      icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
      jobs: [
        {
          title: 'Product Manager, AI Solutions',
          location: 'San Francisco, CA (Remote Friendly)',
          type: 'Full-time',
          description: 'Drive the vision and roadmap for our AI workflow solutions. Experience with enterprise SaaS and AI products required.'
        },
        {
          title: 'UX Designer',
          location: 'San Francisco, CA (Remote Friendly)',
          type: 'Full-time',
          description: 'Create intuitive and beautiful interfaces for complex workflow automation systems. Strong experience in designing AI-powered tools preferred.'
        }
      ]
    },
    {
      department: 'Sales & Marketing',
      icon: <HeartHandshake className="h-5 w-5 text-green-500" />,
      jobs: [
        {
          title: 'Enterprise Sales Representative',
          location: 'San Francisco, CA / New York, NY',
          type: 'Full-time',
          description: 'Drive revenue growth by selling SynthralOS to enterprise clients. Experience in SaaS sales and AI/automation solutions required.'
        },
        {
          title: 'Content Marketing Manager',
          location: 'Remote (US)',
          type: 'Full-time',
          description: 'Create compelling content that educates the market about the power of AI workflow automation. Strong writing skills and technical understanding required.'
        }
      ]
    },
    {
      department: 'Customer Success',
      icon: <Globe className="h-5 w-5 text-orange-500" />,
      jobs: [
        {
          title: 'Customer Success Manager',
          location: 'Remote (US/Europe)',
          type: 'Full-time',
          description: 'Ensure our customers achieve their automation goals and maximize value from SynthralOS. Experience with technical products required.'
        },
        {
          title: 'Implementation Specialist',
          location: 'Remote (US/Europe)',
          type: 'Full-time',
          description: 'Guide customers through the implementation process, from initial setup to complex workflow design.'
        }
      ]
    }
  ];

  // Company values
  const companyValues = [
    {
      icon: <Brain className="h-10 w-10 text-violet-500" />,
      title: 'Intelligent Innovation',
      description: 'We push the boundaries of what\'s possible with AI, challenging assumptions and creating breakthrough solutions.'
    },
    {
      icon: <Heart className="h-10 w-10 text-red-500" />,
      title: 'Human-Centered',
      description: 'We design AI that amplifies human capabilities, prioritizing user needs and ethical considerations.'
    },
    {
      icon: <Globe className="h-10 w-10 text-blue-500" />,
      title: 'Global Perspective',
      description: 'We embrace diverse perspectives and build solutions that work across cultures, languages, and regions.'
    },
    {
      icon: <HeartHandshake className="h-10 w-10 text-green-500" />,
      title: 'Collaborative Excellence',
      description: 'We achieve more together, fostering a culture of teamwork, transparency, and mutual respect.'
    },
    {
      icon: <Lightbulb className="h-10 w-10 text-yellow-500" />,
      title: 'Continuous Learning',
      description: 'We embrace a growth mindset, constantly learning and evolving both as individuals and as an organization.'
    },
    {
      icon: <Coffee className="h-10 w-10 text-amber-500" />,
      title: 'Work-Life Harmony',
      description: 'We believe in sustainable success, prioritizing well-being and creating an environment where people thrive.'
    }
  ];

  // Benefits
  const benefits = [
    {
      icon: <Coins className="h-6 w-6 text-green-500" />,
      title: 'Competitive Compensation',
      description: 'Salary, equity, and bonuses that reflect your expertise and impact.'
    },
    {
      icon: <Heart className="h-6 w-6 text-red-500" />,
      title: 'Comprehensive Healthcare',
      description: 'Medical, dental, and vision coverage for you and your dependents.'
    },
    {
      icon: <Clock className="h-6 w-6 text-blue-500" />,
      title: 'Flexible Work',
      description: 'Remote-friendly environment with flexible hours and unlimited PTO.'
    },
    {
      icon: <Brain className="h-6 w-6 text-violet-500" />,
      title: 'Learning Stipend',
      description: '$5,000 annual budget for courses, conferences, and professional development.'
    },
    {
      icon: <Coffee className="h-6 w-6 text-amber-500" />,
      title: 'Wellness Programs',
      description: 'Mental health resources, fitness reimbursements, and wellness days.'
    },
    {
      icon: <Globe className="h-6 w-6 text-teal-500" />,
      title: 'Remote Team Retreats',
      description: 'Regular company gatherings to connect, collaborate, and celebrate.'
    }
  ];

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
      <section className="py-16 bg-gradient-to-b from-violet-50 to-white dark:from-violet-900/20 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">SynthralOS</span> Team
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
              Help us build the future of intelligent workflow automation and transform how businesses operate in the AI age.
            </p>
            <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white py-2 px-6" size="lg" asChild>
              <a href="#open-positions">View Open Positions</a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Company Values */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Values</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                These principles guide everything we do, from how we build products to how we work together.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {companyValues.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center"
                >
                  <div className="bg-white dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Benefits & Perks</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                We believe in taking care of our team with competitive benefits that support your health, wealth, and happiness.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start">
                    <div className="mr-4 mt-1">{benefit.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{benefit.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="open-positions" className="py-16 bg-white dark:bg-slate-800 scroll-mt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Open Positions</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                Join our team of passionate innovators building the future of AI workflow automation.
              </p>
            </div>
            
            <div className="space-y-8">
              {jobPostings.map((department, deptIndex) => (
                <motion.div
                  key={deptIndex}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center mb-4">
                    <div className="mr-2">{department.icon}</div>
                    <h3 className="text-2xl font-bold">{department.department}</h3>
                  </div>
                  
                  <div className="grid gap-4">
                    {department.jobs.map((job, jobIndex) => (
                      <motion.div
                        key={jobIndex}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: jobIndex * 0.1 }}
                        viewport={{ once: true }}
                        className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                          <h4 className="text-xl font-semibold">{job.title}</h4>
                          <div className="flex items-center mt-2 md:mt-0">
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center mr-4">
                              <Globe className="h-4 w-4 mr-1" />
                              {job.location}
                            </span>
                            <span className="text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 py-1 px-2 rounded-full">
                              {job.type}
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">{job.description}</p>
                        <Button variant="outline" asChild>
                          <a href={`mailto:careers@synthralos.com?subject=Application for ${job.title}`}>
                            Apply Now
                          </a>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-12 p-8 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-100 dark:border-violet-800/30 text-center">
              <h3 className="text-2xl font-bold mb-4">Don't see a perfect fit?</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                We're always looking for exceptional talent. Send your resume and tell us how you can contribute to our mission.
              </p>
              <Button className="bg-violet-600 hover:bg-violet-700" asChild>
                <a href="mailto:careers@synthralos.com?subject=General Application">
                  Send General Application
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Life at SynthralOS</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                Hear from our team about what it's like to work here.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <p className="italic text-slate-600 dark:text-slate-400 mb-6">
                  "The most exciting part about working at SynthralOS is being at the forefront of AI innovation. Every day brings new challenges and opportunities to push the boundaries of what's possible."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 mr-4">
                    <span className="font-semibold">JS</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Jennifer S.</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Senior AI Engineer</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <p className="italic text-slate-600 dark:text-slate-400 mb-6">
                  "The culture here is incredible. We have the autonomy to pursue bold ideas with support when we need it, and everyone is genuinely committed to our mission of transforming how businesses work."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4">
                    <span className="font-semibold">MT</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Michael T.</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Product Manager</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Join Our Mission?</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
              We're building the future of intelligent workflow automation. If you're passionate about AI and want to make a real impact, we'd love to hear from you.
            </p>
            <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white py-2 px-6" size="lg" asChild>
              <a href="#open-positions">Explore Open Positions</a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CareersPage;