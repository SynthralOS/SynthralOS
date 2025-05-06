import React from 'react';
import { motion } from 'framer-motion';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Link } from 'wouter';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

export const FAQSection: React.FC = () => {
  const faqs: FAQItem[] = [
    {
      question: "What is SynthralOS?",
      answer: (
        <p>
          SynthralOS is an advanced AI-powered workflow automation platform that enables intelligent business process integration. It combines a visual workflow builder with multi-agent architecture, advanced document processing, web scraping, and comprehensive API integrations to automate complex tasks that previously required human intervention.
        </p>
      )
    },
    {
      question: "Do I need technical expertise to use SynthralOS?",
      answer: (
        <p>
          No, SynthralOS is designed to be accessible to users of all technical levels. Our visual workflow builder allows you to create sophisticated automation processes without writing code. However, for those who want more control, we also provide advanced options and API access.
        </p>
      )
    },
    {
      question: "What are AI agents and how do they work in SynthralOS?",
      answer: (
        <p>
          AI agents are specialized artificial intelligence components that can perform specific tasks autonomously. In SynthralOS, you can deploy multiple agents that work together, each handling different aspects of a workflow. For example, one agent might extract data from documents, another might analyze that data, and a third might generate reports. Our platform supports 20+ agent protocols including LangChain, AgentGPT, AutoGPT, and more.
        </p>
      )
    },
    {
      question: "What types of tasks can be automated with SynthralOS?",
      answer: (
        <div>
          <p>SynthralOS can automate a wide range of business processes, including but not limited to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Document processing and data extraction</li>
            <li>Customer support workflows</li>
            <li>Social media monitoring and response</li>
            <li>Market research and competitive analysis</li>
            <li>Content generation and distribution</li>
            <li>Data analysis and reporting</li>
            <li>Complex approval processes</li>
          </ul>
        </div>
      )
    },
    {
      question: "How does SynthralOS integrate with my existing systems?",
      answer: (
        <p>
          SynthralOS offers 300+ pre-built connectors for popular platforms, databases, and services. Additionally, our platform provides comprehensive API integration capabilities and webhook support, allowing you to connect to virtually any system. For custom integrations, our team can provide assistance or you can use our developer tools to build your own connectors.
        </p>
      )
    },
    {
      question: "Is SynthralOS secure for enterprise use?",
      answer: (
        <p>
          Yes, security is a top priority for SynthralOS. Our platform is SOC 2 Type II compliant and includes end-to-end encryption, role-based access controls, comprehensive audit logging, and data privacy features. We also offer a self-hosted deployment option for organizations with strict security requirements.
        </p>
      )
    },
    {
      question: "How is SynthralOS priced?",
      answer: (
        <p>
          SynthralOS offers flexible pricing plans based on your needs. Our Starter plan includes basic features with limited workflow executions, while our Professional and Enterprise plans offer more advanced capabilities, higher execution limits, and additional support options. Visit our <Link href="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline">pricing page</Link> for detailed information or contact us for custom enterprise pricing.
        </p>
      )
    },
    {
      question: "Do you offer a free trial?",
      answer: (
        <p>
          Yes, we offer a 14-day free trial with no credit card required. This gives you full access to the platform so you can test it with your specific use cases. After the trial period, you can choose the plan that best fits your needs. <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Sign up here</Link> to start your free trial.
        </p>
      )
    },
    {
      question: "What kind of support do you provide?",
      answer: (
        <p>
          All plans include access to our comprehensive documentation and community forum. The Professional plan includes priority email support, while the Enterprise plan offers dedicated support with a named account manager, faster response times, and optional onboarding and training sessions. We also offer professional services for custom implementation projects.
        </p>
      )
    },
    {
      question: "Can I export my workflows and data from SynthralOS?",
      answer: (
        <p>
          Yes, SynthralOS provides export options for your workflows, configurations, and data. You have full ownership of your content and can export it in standard formats for portability. For Enterprise customers, we also offer advanced migration tools and services.
        </p>
      )
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
              Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Questions</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Find answers to common questions about SynthralOS and how it can transform your business processes.
            </p>
          </motion.div>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <AccordionItem value={`item-${index}`} className="border rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                  <AccordionTrigger className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 text-left font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 pt-2 text-slate-600 dark:text-slate-400">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Still have questions? We're here to help.
          </p>
          <Link href="/contact" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            Contact our support team
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
