import React, { useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';
import { 
  Presentation, 
  CheckCircle, 
  Calendar, 
  Clock, 
  Phone, 
  Monitor, 
  Users,
  Workflow,
  Bot,
  FileText,
  Database,
  Network
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// Demo types
const demoTypes = [
  {
    id: 'personalized',
    title: 'Personalized Demo',
    description: 'Schedule a 1-on-1 demo with a product expert tailored to your specific use cases and questions.',
    icon: <Users className="h-8 w-8 text-violet-500" />,
    durationText: '45 minutes',
    buttonText: 'Schedule Demo',
    recommended: true
  },
  {
    id: 'group',
    title: 'Group Demo',
    description: 'Join our weekly live demo with Q&A session. Perfect for initial evaluation with your team.',
    icon: <Presentation className="h-8 w-8 text-blue-500" />,
    durationText: '60 minutes',
    buttonText: 'Register for Demo',
    recommended: false
  },
  {
    id: 'recorded',
    title: 'Recorded Demo',
    description: 'Watch an on-demand demo video showcasing key features and capabilities at your own pace.',
    icon: <Monitor className="h-8 w-8 text-green-500" />,
    durationText: '30 minutes',
    buttonText: 'Watch Demo',
    recommended: false
  }
];

// Demo features
const demoFeatures = [
  {
    id: 'workflow',
    title: 'Visual Workflow Builder',
    description: 'See how to create sophisticated automation workflows with our intuitive drag-and-drop interface.',
    icon: <Workflow className="h-6 w-6 text-violet-500" />
  },
  {
    id: 'agents',
    title: 'Multi-Agent Architecture',
    description: 'Learn how our specialized AI agents work together to solve complex problems autonomously.',
    icon: <Bot className="h-6 w-6 text-blue-500" />
  },
  {
    id: 'ocr',
    title: 'Advanced OCR Processing',
    description: 'Discover our engine switching technology that automatically selects the optimal OCR approach.',
    icon: <FileText className="h-6 w-6 text-green-500" />
  },
  {
    id: 'connectors',
    title: '300+ Pre-built Connectors',
    description: 'Explore how to integrate with your existing tools through our extensive connector library.',
    icon: <Network className="h-6 w-6 text-orange-500" />
  },
  {
    id: 'vector',
    title: 'Vector Database Management',
    description: 'See how to store, query, and manage embeddings efficiently for AI-powered search.',
    icon: <Database className="h-6 w-6 text-pink-500" />
  }
];

const DemoPage = () => {
  const { toast } = useToast();
  const [selectedDemo, setSelectedDemo] = useState(demoTypes[0].id);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    phoneNumber: '',
    useCase: ''
  });
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      toast({
        title: "Demo request submitted!",
        description: "A member of our team will contact you shortly to schedule your demo.",
      });
    }, 1500);
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
              <Presentation className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Request a Demo</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              See SynthralOS in action and discover how our intelligent workflow automation platform can transform your business operations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {demoTypes.map((demo) => (
                <motion.div
                  key={demo.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className={`relative bg-white dark:bg-slate-900 rounded-lg border ${
                    selectedDemo === demo.id 
                      ? 'border-violet-500 dark:border-violet-400 ring-2 ring-violet-500/20' 
                      : 'border-slate-200 dark:border-slate-700'
                  } p-6 cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => setSelectedDemo(demo.id)}
                >
                  {demo.recommended && (
                    <div className="absolute -top-3 left-0 right-0 flex justify-center">
                      <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Recommended
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center">
                      {demo.icon}
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedDemo === demo.id
                        ? 'border-violet-500 bg-violet-500 dark:border-violet-400 dark:bg-violet-400'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {selectedDemo === demo.id && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">{demo.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{demo.description}</p>
                  
                  <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{demo.durationText}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Demo Features */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">What would you like to see in your demo?</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {demoFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className={`bg-white dark:bg-slate-900 border ${
                      selectedFeatures.includes(feature.id)
                        ? 'border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-900/10'
                        : 'border-slate-200 dark:border-slate-700'
                    } rounded-lg p-4 cursor-pointer hover:shadow-sm transition-all`}
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">{feature.icon}</div>
                      <div>
                        <h3 className="font-medium mb-1">{feature.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Request Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Your Information</h2>
              <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                      First Name *
                    </label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                      Last Name *
                    </label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Work Email *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2">
                      Phone Number
                    </label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium mb-2">
                      Company *
                    </label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium mb-2">
                      Job Title *
                    </label>
                    <Input
                      id="jobTitle"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="useCase" className="block text-sm font-medium mb-2">
                    What workflow automation challenges are you looking to solve?
                  </label>
                  <Textarea
                    id="useCase"
                    name="useCase"
                    rows={4}
                    value={formData.useCase}
                    onChange={handleInputChange}
                    placeholder="Please describe your current process and challenges..."
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <div className="mb-4 sm:mb-0 text-sm text-slate-500 dark:text-slate-400 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>You'll receive scheduling options via email</span>
                  </div>
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={submitting}
                    className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
                  >
                    {submitting ? 'Submitting...' : 'Request Demo'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">What Our Customers Say</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                    <span className="font-semibold">JP</span>
                  </div>
                  <div>
                    <p className="font-medium">James Peterson</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">CTO, TechStream Inc.</p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  "SynthralOS has transformed our document processing workflows. What used to take hours is now completed in minutes with greater accuracy."
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
                    <span className="font-semibold">SN</span>
                  </div>
                  <div>
                    <p className="font-medium">Sarah Nguyen</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Operations Director, GlobalHealth</p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  "The multi-agent architecture is a game-changer. It allows us to automate complex workflows that previously required multiple systems and manual intervention."
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-3">
                    <span className="font-semibold">MR</span>
                  </div>
                  <div>
                    <p className="font-medium">Michael Rodriguez</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">VP of Marketing, BrandConnect</p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  "The social monitoring capabilities have given us unprecedented insights into our brand perception and customer sentiment across all platforms."
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-2">How long does a typical demo last?</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Personalized demos typically last 45 minutes, with extra time for Q&A. Group demos are scheduled for 60 minutes to accommodate questions from multiple attendees.
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-2">Can I invite my team to the demo?</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Absolutely! We encourage you to invite all relevant stakeholders. Just let us know in advance so we can ensure the demo addresses everyone's questions and concerns.
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-2">What happens after I submit my demo request?</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You'll receive an email confirmation with next steps. For personalized demos, a member of our team will reach out within one business day to schedule at a time that works for you.
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-2">Can the demo be tailored to my industry?</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Yes! We offer industry-specific demos that showcase relevant use cases and workflows. Please mention your industry and specific needs in your request form.
                </p>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <div className="inline-flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Phone className="h-5 w-5 text-blue-500 mr-3" />
                <span>
                  Have more questions? Call us at <a href="tel:+18005551234" className="font-medium text-blue-600 dark:text-blue-400">1-800-555-1234</a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DemoPage;