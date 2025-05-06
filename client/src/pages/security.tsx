import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';
import { Shield, ShieldCheck, ShieldAlert, Lock, Key, Server, Database, FileCheck } from 'lucide-react';

const SecurityPage = () => {
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Our Security Promise</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Protecting your data with enterprise-grade security is our top priority
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
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                  <ShieldCheck className="w-10 h-10 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">SOC 2 Compliance</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    SynthralOS maintains SOC 2 Type II compliance, verifying our security, availability, processing integrity, confidentiality, and privacy controls.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Lock className="w-10 h-10 text-blue-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">End-to-End Encryption</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Your data is encrypted in transit and at rest using industry-standard AES-256 encryption, ensuring maximum protection of sensitive information.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Key className="w-10 h-10 text-violet-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Role-Based Access Control</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Granular permission controls allow you to define exactly who can access what within your organization, with detailed audit logs.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                  <FileCheck className="w-10 h-10 text-orange-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Regular Audits</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    We conduct regular security audits and penetration testing by third-party security firms to identify and address potential vulnerabilities.
                  </p>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Infrastructure Security</h2>
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-start">
                      <Server className="w-5 h-5 text-blue-500 mt-1 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Secure Cloud Infrastructure</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          SynthralOS is built on top of enterprise-grade cloud infrastructure with redundant systems, backups, and disaster recovery protocols.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Database className="w-5 h-5 text-blue-500 mt-1 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Data Isolation</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          Customer data is logically isolated to ensure that one customer's data cannot be accessed by others, with separate encryption keys for each customer.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <ShieldAlert className="w-5 h-5 text-blue-500 mt-1 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">DDoS Protection</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          Advanced DDoS protection is in place to mitigate distributed denial-of-service attacks and ensure platform availability.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Our Security Commitments</h2>
                <div className="prose dark:prose-invert prose-slate max-w-none">
                  <p>
                    At SynthralOS, we understand that security is not just a feature, but a fundamental requirement for our customers. 
                    Our commitment to security is built into our development process, operations, and company culture.
                  </p>
                  
                  <h3>Secure Development</h3>
                  <p>
                    Our development process includes security review at every stage. We conduct regular code reviews, 
                    static analysis, and vulnerability scanning to identify and address security issues early.
                  </p>
                  
                  <h3>Physical Security</h3>
                  <p>
                    Our infrastructure is hosted in SOC 2 compliant data centers with 24/7 monitoring, 
                    biometric access controls, and redundant power and cooling systems.
                  </p>
                  
                  <h3>Employee Security</h3>
                  <p>
                    All employees undergo background checks and regular security training. 
                    Access to production systems is limited and requires multi-factor authentication.
                  </p>
                  
                  <h3>Compliance</h3>
                  <p>
                    We maintain compliance with industry standards and regulations including SOC 2, 
                    GDPR, HIPAA, and more, depending on customer requirements and industry needs.
                  </p>
                  
                  <h3>Incident Response</h3>
                  <p>
                    We have a dedicated incident response team ready to respond to security events 24/7. 
                    Our response plan includes notification procedures to keep customers informed.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 border border-blue-100 dark:border-blue-800">
                <h2 className="text-2xl font-bold mb-4 text-blue-700 dark:text-blue-300">Get in Touch</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Have questions about our security practices or need more information for your security team? 
                  We're happy to provide additional details or schedule a security review.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                    <Link href="/contact">Contact Security Team</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="mailto:security@synthralos.com">security@synthralos.com</a>
                  </Button>
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

export default SecurityPage;