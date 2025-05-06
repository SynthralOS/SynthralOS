import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Footer } from '@/components/landing/Footer';
import { Card } from '@/components/ui/card';
import { LucideHeadphones, LucideHelpCircle, LucideMailOpen, LucideMessageSquare } from 'lucide-react';

const ContactPage = () => {
  const [formState, setFormState] = React.useState({
    name: '',
    email: '',
    company: '',
    interest: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormState(prev => ({ ...prev, interest: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would send the form data to a server
    console.log('Form submitted:', formState);
    alert('Thank you for your message! Our team will get back to you soon.');
    setFormState({
      name: '',
      email: '',
      company: '',
      interest: '',
      message: ''
    });
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
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Get in Touch</h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              Have questions or ready to get started with SynthralOS? Our team is here to help.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="h-full p-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <LucideMailOpen className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Email Us</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Send us an email anytime and we'll respond within 24 hours.
                </p>
                <a href="mailto:hello@synthralos.com" className="text-blue-600 dark:text-blue-400 font-medium">
                  hello@synthralos.com
                </a>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="h-full p-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4">
                  <LucideHeadphones className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Call Us</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Speak directly with our team during business hours.
                </p>
                <a href="tel:+1234567890" className="text-violet-600 dark:text-violet-400 font-medium">
                  +1 (234) 567-890
                </a>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="h-full p-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                  <LucideMessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Live Chat</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Get immediate help from our support team through live chat.
                </p>
                <button className="text-green-600 dark:text-green-400 font-medium">
                  Start Chat
                </button>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Send Us a Message</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formState.name} 
                      onChange={handleChange} 
                      placeholder="Enter your full name" 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formState.email} 
                      onChange={handleChange} 
                      placeholder="Enter your email address" 
                      required 
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input 
                      id="company" 
                      name="company" 
                      value={formState.company} 
                      onChange={handleChange} 
                      placeholder="Enter your company name" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="interest">I'm interested in</Label>
                    <Select onValueChange={handleSelectChange} value={formState.interest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="getting_started">Getting Started</SelectItem>
                        <SelectItem value="pricing">Pricing Information</SelectItem>
                        <SelectItem value="demo">Request a Demo</SelectItem>
                        <SelectItem value="enterprise">Enterprise Solutions</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    value={formState.message} 
                    onChange={handleChange} 
                    placeholder="Tell us how we can help you" 
                    rows={6} 
                    required 
                  />
                </div>
                
                <div className="text-center">
                  <Button type="submit" size="lg" className="px-8 bg-violet-600 hover:bg-violet-700">
                    Send Message
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center mb-6">
            <LucideHelpCircle className="h-5 w-5 mr-2 text-violet-600 dark:text-violet-400" />
            <span className="text-lg font-bold">Have more questions?</span>
          </div>
          <h2 className="text-2xl font-bold mb-8">Check out our comprehensive FAQ</h2>
          <Button variant="outline" asChild>
            <Link href="/faq">View FAQ</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;