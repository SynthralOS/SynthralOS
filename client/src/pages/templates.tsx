import React, { useState } from 'react';
import { Link } from 'wouter';
import { AppLayout } from '@/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SearchIcon } from '@/lib/icons';

// Mock template data - will be replaced with API calls later
const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'content', label: 'Content Creation' },
  { id: 'data', label: 'Data Processing' },
  { id: 'ai', label: 'AI Assistants' },
  { id: 'ocr', label: 'OCR & Document' },
  { id: 'scraping', label: 'Web Scraping' },
];

const TEMPLATES = [
  {
    id: 1,
    name: 'Email Summarizer',
    description: 'Automatically extract key points from lengthy emails and generate concise summaries.',
    category: 'productivity',
    tags: ['Email', 'AI', 'Text Processing'],
    popularity: 4.8,
    image: '📧',
  },
  {
    id: 2,
    name: 'Social Media Content Generator',
    description: 'Create engaging social media posts from blog articles or product descriptions.',
    category: 'content',
    tags: ['Social Media', 'AI', 'Marketing'],
    popularity: 4.6,
    image: '📱',
  },
  {
    id: 3,
    name: 'Invoice Processor',
    description: 'Extract line items, totals, and vendor details from invoices using OCR.',
    category: 'ocr',
    tags: ['Finance', 'OCR', 'Document Processing'],
    popularity: 4.9,
    image: '📄',
  },
  {
    id: 4,
    name: 'Product Price Monitor',
    description: 'Track product prices across multiple e-commerce sites and get notified of price drops.',
    category: 'scraping',
    tags: ['E-commerce', 'Scraping', 'Notifications'],
    popularity: 4.7,
    image: '🛒',
  },
  {
    id: 5,
    name: 'Customer Support Assistant',
    description: 'AI-powered workflow that categorizes and drafts responses to customer inquiries.',
    category: 'ai',
    tags: ['Customer Support', 'AI', 'Email'],
    popularity: 4.5,
    image: '🤖',
  },
  {
    id: 6,
    name: 'Data Enrichment Pipeline',
    description: 'Enhance your CRM contacts with data from LinkedIn, company websites, and other sources.',
    category: 'data',
    tags: ['CRM', 'Data', 'API Integration'],
    popularity: 4.4,
    image: '📊',
  },
  {
    id: 7,
    name: 'Resume Parser',
    description: 'Extract skills, experience, and education from resumes in various formats.',
    category: 'ocr',
    tags: ['HR', 'OCR', 'Document Processing'],
    popularity: 4.6,
    image: '📝',
  },
  {
    id: 8,
    name: 'News Aggregator',
    description: 'Collect, categorize, and summarize news articles from multiple sources.',
    category: 'scraping',
    tags: ['News', 'Scraping', 'Content'],
    popularity: 4.3,
    image: '📰',
  },
];

export default function Templates() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter templates based on active category and search term
  const filteredTemplates = TEMPLATES.filter(template => {
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <AppLayout title="Template Gallery">
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-auto">
        {/* Header */}
        <div className="p-6 pb-0">
          <h1 className="text-3xl font-bold mb-2">Workflow Templates</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Browse our collection of pre-built workflow templates to jumpstart your automation
          </p>
          
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div className="relative w-full md:w-80">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search templates..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1"></div>
            <Link href="/builder">
              <Button>Create Custom Workflow</Button>
            </Link>
          </div>
          
          {/* Category Tabs */}
          <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-2">
              {TEMPLATE_CATEGORIES.map(category => (
                <TabsTrigger key={category.id} value={category.id}>{category.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        {/* Template Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map(template => (
              <TemplateCard key={template.id} template={template} />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-medium mb-2">No templates found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                We couldn't find any templates matching your search criteria.
              </p>
              <Button variant="outline" onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// Helper component for template cards
interface TemplateCardProps {
  template: typeof TEMPLATES[0];
}

function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="text-3xl mb-2">{template.image}</div>
          <Badge variant="outline">{template.category}</Badge>
        </div>
        <CardTitle className="text-lg">{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2">
          {template.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`text-sm ${i < Math.floor(template.popularity) ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600'}`}>
                ★
              </span>
            ))}
          </div>
          <span className="text-xs text-slate-500 ml-1">{template.popularity.toFixed(1)}</span>
        </div>
        <Link href={`/builder?template=${template.id}`}>
          <Button variant="outline" size="sm">Use Template</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}