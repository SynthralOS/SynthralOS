import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AppLayout } from '@/layouts/AppLayout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Globe, GanttChart, AlertCircle, Check } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

// Types for scraping jobs
interface ScrapingJob {
  id: number;
  url: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface ScrapingResult {
  id: number;
  jobId: number;
  data: any;
  createdAt: string;
}

interface ScrapingConfig {
  url: string;
  type: string;
  selectors?: Record<string, string>;
  options?: any;
}

const defaultConfig: ScrapingConfig = {
  url: '',
  type: 'beautifulsoup',
  selectors: {
    title: 'h1',
    description: 'meta[name="description"]',
    content: 'article'
  },
  options: {
    timeout: 30000,
    waitForSelector: 'body',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
};

export default function ScraperPage() {
  const [tab, setTab] = useState('new');
  const [config, setConfig] = useState<ScrapingConfig>(defaultConfig);
  const [selectorsText, setSelectorsText] = useState(JSON.stringify(defaultConfig.selectors, null, 2));
  const [optionsText, setOptionsText] = useState(JSON.stringify(defaultConfig.options, null, 2));
  const [selectedJob, setSelectedJob] = useState<number | null>(null);

  // Fetch scraping jobs
  const { 
    data: jobs, 
    isLoading: isLoadingJobs, 
    refetch: refetchJobs 
  } = useQuery({
    queryKey: ['/api/scraping-jobs'],
    enabled: tab === 'jobs' || tab === 'results',
  });

  // Fetch scraping results for a selected job
  const { 
    data: results, 
    isLoading: isLoadingResults 
  } = useQuery({
    queryKey: ['/api/scraping-jobs', selectedJob, 'results'],
    enabled: !!selectedJob,
  });

  // Create new scraping job
  const { mutate: createJob, isPending: isCreatingJob } = useMutation({
    mutationFn: async (payload: ScrapingConfig) => {
      const response = await apiRequest('POST', '/api/scraping-jobs', payload);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Scraping job created',
        description: `Job #${data.id} created successfully`,
      });
      refetchJobs();
      setTab('jobs');
    },
    onError: (error) => {
      toast({
        title: 'Failed to create job',
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse JSON fields
      const selectors = JSON.parse(selectorsText);
      const options = JSON.parse(optionsText);
      
      // Create new config with parsed JSON fields
      const newConfig = {
        ...config,
        selectors,
        options
      };
      
      // Submit the job
      createJob(newConfig);
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: `Please check your selectors and options JSON format`,
        variant: 'destructive',
      });
    }
  };

  // Handle URL and type changes
  const handleConfigChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout title="Web Scraper">
      <div className="p-6 h-full overflow-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Web Scraper</h1>
        </div>
        
        <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="new">New Scraper</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="monitoring">Change Monitoring</TabsTrigger>
        </TabsList>
        
        {/* New Scraper Tab */}
        <TabsContent value="new">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create New Scraping Job</CardTitle>
                <CardDescription>
                  Configure your scraper to extract data from any website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Target URL</Label>
                    <Input 
                      id="url" 
                      placeholder="https://example.com" 
                      value={config.url}
                      onChange={(e) => handleConfigChange('url', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Scraper Type</Label>
                    <Select 
                      value={config.type} 
                      onValueChange={(value) => handleConfigChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select scraper type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beautifulsoup">BeautifulSoup</SelectItem>
                        <SelectItem value="scrapy">Scrapy</SelectItem>
                        <SelectItem value="playwright">Playwright</SelectItem>
                        <SelectItem value="puppeteer">Puppeteer</SelectItem>
                        <SelectItem value="selenium">Selenium</SelectItem>
                        <SelectItem value="jobspy">JobSpy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="selectors">CSS Selectors (JSON)</Label>
                    <Textarea 
                      id="selectors" 
                      placeholder="Enter selectors as JSON"
                      value={selectorsText}
                      onChange={(e) => setSelectorsText(e.target.value)}
                      className="font-mono text-sm"
                      rows={6}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="options">Advanced Options (JSON)</Label>
                    <Textarea 
                      id="options" 
                      placeholder="Enter options as JSON"
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      className="font-mono text-sm"
                      rows={6}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isCreatingJob}>
                    {isCreatingJob ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Job...
                      </>
                    ) : (
                      'Create Scraping Job'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Usage Guide</CardTitle>
                <CardDescription>
                  How to use the SynthralOS web scraper
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Getting Started</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Our powerful web scraper can extract data from virtually any website using different scraping engines
                    optimized for various scenarios.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">CSS Selectors</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Use standard CSS selectors to target elements on the page. Each key in the selectors object
                    will become a field in your results.
                  </p>
                  <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs mt-2 overflow-auto">
{`{
  "title": "h1",
  "description": "meta[name=\\"description\\"]",
  "price": ".product-price",
  "images": ".product-gallery img"
}`}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Advanced Options</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Configure the scraper behavior with options like timeouts, request headers, and more.
                  </p>
                  <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs mt-2 overflow-auto">
{`{
  "timeout": 30000,
  "waitForSelector": "body",
  "userAgent": "Mozilla/5.0 ...",
  "headers": {
    "Accept-Language": "en-US,en;q=0.9"
  }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Scraping Jobs</CardTitle>
              <CardDescription>
                View and manage your scraping jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingJobs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !jobs || !Array.isArray(jobs) || jobs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No scraping jobs found. Create a new job to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableCaption>A list of your scraping jobs</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(jobs) && jobs.map((job: ScrapingJob) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.id}</TableCell>
                        <TableCell className="max-w-xs truncate">{job.url}</TableCell>
                        <TableCell>{job.type}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {job.status === 'pending' && (
                              <div className="flex items-center text-amber-500">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                <span>Pending</span>
                              </div>
                            )}
                            {job.status === 'in_progress' && (
                              <div className="flex items-center text-blue-500">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                <span>In Progress</span>
                              </div>
                            )}
                            {job.status === 'completed' && (
                              <div className="flex items-center text-green-500">
                                <Check className="h-3 w-3 mr-1" />
                                <span>Completed</span>
                              </div>
                            )}
                            {job.status === 'failed' && (
                              <div className="flex items-center text-red-500">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                <span>Failed</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedJob(job.id);
                              setTab('results');
                            }}
                          >
                            View Results
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => refetchJobs()}>
                Refresh
              </Button>
              <Button variant="default" onClick={() => setTab('new')}>
                New Job
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Results Tab */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Scraping Results</CardTitle>
              <CardDescription>
                {selectedJob ? `Results for Job #${selectedJob}` : 'Select a job to view results'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedJob ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Select a job from the Jobs tab to view its results</p>
                  <Button 
                    variant="link" 
                    onClick={() => setTab('jobs')}
                    className="mt-2"
                  >
                    Go to Jobs
                  </Button>
                </div>
              ) : isLoadingResults ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !results || !Array.isArray(results) || results.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No results found for this job. The job may still be processing or encountered an error.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-auto text-xs">
                    {Array.isArray(results) && results.length > 0 && results[0].data ? 
                      JSON.stringify(results[0].data, null, 2) : 
                      'No data available'}
                  </pre>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => setSelectedJob(null)}
                className="mr-2"
              >
                Clear Selection
              </Button>
              <Button 
                variant="default" 
                onClick={() => setTab('jobs')}
              >
                Back to Jobs
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Scraping Templates</CardTitle>
              <CardDescription>
                Pre-configured scraper templates for common websites
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[400px] flex flex-col items-center justify-center text-slate-500">
              <GanttChart className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-center">Scraper templates feature coming soon</p>
              <p className="text-center text-sm mt-2">
                Create, save, and share scraper configurations for popular websites and data sources
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>Website Change Monitoring</CardTitle>
              <CardDescription>
                Monitor websites for changes and get notified
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[400px] flex flex-col items-center justify-center text-slate-500">
              <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-center">Change monitoring feature coming soon</p>
              <p className="text-center text-sm mt-2">
                Set up monitoring jobs to track changes on websites and receive notifications
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}