import React from 'react';
import { Link } from 'wouter';
import { 
  LucideGithub, 
  LucideTwitter, 
  LucideLinkedin, 
  LucideMail, 
  LucideYoutube 
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-white">
      {/* Footer Top Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Logo & Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-semibold">S</div>
              <span className="text-xl font-bold">SynthralOS</span>
            </div>
            <p className="text-slate-400 mb-6 max-w-md">
              The next-generation AI workflow automation platform that brings intelligence to your business processes.
            </p>
            <div className="flex space-x-4">
              <a href="https://github.com/synthralos" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                <LucideGithub className="h-5 w-5" />
              </a>
              <a href="https://twitter.com/synthralos" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                <LucideTwitter className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com/company/synthralos" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                <LucideLinkedin className="h-5 w-5" />
              </a>
              <a href="https://youtube.com/c/synthralos" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                <LucideYoutube className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          {/* Product */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/features" className="text-slate-400 hover:text-white">Features</Link></li>
              <li><Link href="/pricing" className="text-slate-400 hover:text-white">Pricing</Link></li>
              <li><Link href="/roadmap" className="text-slate-400 hover:text-white">Roadmap</Link></li>
              <li><Link href="/demo" className="text-slate-400 hover:text-white">Request a Demo</Link></li>
            </ul>
          </div>
          
          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-slate-400 hover:text-white">About Us</Link></li>
              <li><Link href="/contact" className="text-slate-400 hover:text-white">Contact</Link></li>
              <li><Link href="/careers" className="text-slate-400 hover:text-white">Careers</Link></li>
              <li><Link href="/blog" className="text-slate-400 hover:text-white">Blog</Link></li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-slate-400 hover:text-white">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-slate-400 hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/security" className="text-slate-400 hover:text-white">Security</Link></li>
              <li><Link href="/cookies" className="text-slate-400 hover:text-white">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Footer Bottom Section */}
      <div className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} SynthralOS. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <a href="mailto:hello@synthralos.com" className="text-slate-500 hover:text-white text-sm flex items-center">
                <LucideMail className="h-4 w-4 mr-2" />
                hello@synthralos.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};