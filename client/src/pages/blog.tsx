import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';
import { 
  BookOpen, 
  Calendar, 
  User, 
  Tag, 
  ChevronRight, 
  Search,
  ArrowRight
} from 'lucide-react';

const BlogPage = () => {
  // Sample blog data
  const featuredPost = {
    id: 'multi-agent-architecture',
    title: 'Multi-Agent Architecture: The Future of AI Workflow Automation',
    description: 'Learn how multiple AI agents working in concert can solve complex business problems more effectively than single-agent approaches.',
    image: '/img/blog/multi-agent-architecture.jpg',
    author: 'Sarah Chen',
    authorRole: 'Chief AI Officer',
    date: 'May 3, 2025',
    category: 'AI Research',
    readTime: '7 min read'
  };

  const blogPosts = [
    {
      id: 'ocr-engine-switching',
      title: 'How OCR Engine Switching Improves Document Processing Accuracy',
      description: 'Our research shows that dynamically selecting the optimal OCR engine based on document type improves accuracy by up to 35%.',
      author: 'David Rodriguez',
      authorRole: 'Technical Lead, Document Processing',
      date: 'April 28, 2025',
      category: 'Technical',
      readTime: '5 min read'
    },
    {
      id: 'social-monitoring-trends',
      title: 'Social Monitoring Trends for 2025 and Beyond',
      description: 'As social media continues to evolve, so do the tools and strategies for effective brand monitoring. Here\'s what to watch for.',
      author: 'Michelle Park',
      authorRole: 'Head of Social Intelligence',
      date: 'April 22, 2025',
      category: 'Industry Insights',
      readTime: '6 min read'
    },
    {
      id: 'recursive-planning',
      title: 'Recursive Planning: How AI Agents Break Down Complex Tasks',
      description: 'An in-depth look at how SynthralOS agents use recursive planning to tackle complex workflows with dynamic adaptation.',
      author: 'James Wilson',
      authorRole: 'AI Research Engineer',
      date: 'April 15, 2025',
      category: 'AI Research',
      readTime: '8 min read'
    },
    {
      id: 'api-integration',
      title: 'Connecting Everything: The Power of 300+ Pre-built Connectors',
      description: 'How SynthralOS is building the most comprehensive integration ecosystem for business automation.',
      author: 'Lisa Tanaka',
      authorRole: 'Product Manager, Integrations',
      date: 'April 8, 2025',
      category: 'Product',
      readTime: '4 min read'
    },
    {
      id: 'workflow-case-study',
      title: 'Case Study: How Acme Corp Automated 85% of Their Document Processing',
      description: 'Learn how a global manufacturing company transformed their operations with intelligent automation.',
      author: 'Robert Johnson',
      authorRole: 'Customer Success Director',
      date: 'April 1, 2025',
      category: 'Case Study',
      readTime: '6 min read'
    },
    {
      id: 'vector-databases',
      title: 'Vector Databases: The Backbone of AI-Powered Search and Retrieval',
      description: 'A technical deep dive into how vector databases enable semantic search and knowledge retrieval in SynthralOS.',
      author: 'Aisha Patel',
      authorRole: 'Database Architect',
      date: 'March 25, 2025',
      category: 'Technical',
      readTime: '9 min read'
    }
  ];

  const categories = [
    { name: 'All Posts', count: 42 },
    { name: 'AI Research', count: 15 },
    { name: 'Technical', count: 13 },
    { name: 'Product', count: 8 },
    { name: 'Industry Insights', count: 7 },
    { name: 'Case Study', count: 5 },
    { name: 'Company News', count: 4 }
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
      <section className="py-12 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4">SynthralOS Blog</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Insights, tutorials, and news about AI workflow automation and the future of work
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="py-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search articles..."
                />
              </div>
              <select
                className="border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option>All Categories</option>
                <option>AI Research</option>
                <option>Technical</option>
                <option>Product</option>
                <option>Industry Insights</option>
                <option>Case Study</option>
                <option>Company News</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="md:col-span-2">
                {/* Featured Post */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="mb-12"
                >
                  <h2 className="text-2xl font-bold mb-6">Featured Article</h2>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="aspect-w-16 aspect-h-9 bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center p-12">
                      <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <Tag className="h-4 w-4 text-blue-500 mr-2" />
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{featuredPost.category}</span>
                        <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{featuredPost.readTime}</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{featuredPost.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">{featuredPost.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 mr-3">
                            <span className="font-semibold text-xs">{featuredPost.author.split(' ').map(n => n[0]).join('')}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{featuredPost.author}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{featuredPost.date}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400" asChild>
                          <Link href={`/blog/${featuredPost.id}`}>
                            Read Article <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Recent Posts */}
                <div>
                  <h2 className="text-2xl font-bold mb-6">Recent Articles</h2>
                  <div className="grid gap-8">
                    {blogPosts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center mb-4">
                          <Tag className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{post.category}</span>
                          <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">{post.readTime}</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">{post.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                              <span className="font-semibold text-xs">{post.author.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{post.author}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{post.date}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400" asChild>
                            <Link href={`/blog/${post.id}`}>
                              Read Article <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="mt-8 text-center">
                    <Button variant="outline" size="lg">
                      Load More Articles
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="md:col-span-1">
                <div className="sticky top-8">
                  {/* Categories */}
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-bold mb-4">Categories</h3>
                    <ul className="space-y-2">
                      {categories.map((category, index) => (
                        <li key={index}>
                          <a className="flex items-center justify-between py-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <span>{category.name}</span>
                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs py-1 px-2 rounded-full">
                              {category.count}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Newsletter Signup */}
                  <div className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4">Subscribe to Our Newsletter</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                      Get the latest articles and insights on AI workflow automation delivered to your inbox.
                    </p>
                    <div className="space-y-4">
                      <input
                        type="email"
                        placeholder="Your email address"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        Subscribe
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                      We respect your privacy. Unsubscribe at any time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogPage;