import React from 'react';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { WhyUsSection } from './WhyUsSection';
import { TimelineSection } from './TimelineSection';
import { ComparisonSection } from './ComparisonSection';
import { FAQSection } from './FAQSection';
import { CTASection } from './CTASection';
import { Footer } from './Footer';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900">
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <WhyUsSection />
        <TimelineSection />
        <ComparisonSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};