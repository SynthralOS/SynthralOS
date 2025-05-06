import React, { useState } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

type OsintSourceType = 
  | 'social_media'
  | 'news'
  | 'forums'
  | 'blogs'
  | 'company_info'
  | 'person_info'
  | 'domain_info'
  | 'whois'
  | 'dns'
  | 'other';

type OsintResult = {
  source: OsintSourceType;
  sourceName: string;
  sourceUrl?: string;
  data: any;
  timestamp: string;
  confidence: number;
  relevance: number;
  metadata: Record<string, any>;
};

type SearchQuery = {
  term: string;
  sources?: OsintSourceType[];
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
};

export default function OsintSearch() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    term: '',
    sources: undefined,
    timeframe: 'all',
    limit: 10
  });
  const [results, setResults] = useState<OsintResult[] | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  // Define available sources
  const availableSources: { value: OsintSourceType; label: string }[] = [
    { value: 'social_media', label: 'Social Media' },
    { value: 'news', label: 'News Articles' },
    { value: 'forums', label: 'Forums' },
    { value: 'blogs', label: 'Blogs' },
    { value: 'company_info', label: 'Company Information' },
    { value: 'person_info', label: 'Person Information' },
    { value: 'domain_info', label: 'Domain Information' },
    { value: 'whois', label: 'WHOIS Records' },
    { value: 'dns', label: 'DNS Information' }
  ];

  // Mutation for OSINT search
  const search = useMutation({
    mutationFn: async (query: SearchQuery) => {
      const response = await apiRequest('POST', '/api/osint/search', query);
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data);
      toast({
        title: 'Search completed',
        description: `Found ${data.length} results for "${searchQuery.term}"`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Search failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Mutation for person lookup
  const personLookup = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/osint/person', { name });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Person lookup completed',
        description: `Found information for ${data.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Person lookup failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Mutation for company lookup
  const companyLookup = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/osint/company', { name });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Company lookup completed',
        description: `Found information for ${data.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Company lookup failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Mutation for sentiment analysis
  const analyzeSentiment = useMutation({
    mutationFn: async ({ term, platforms }: { term: string, platforms?: string[] }) => {
      const response = await apiRequest('POST', '/api/osint/sentiment', { term, platforms });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Sentiment analysis completed',
        description: `Analyzed sentiment for "${data.term}"`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Sentiment analysis failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery({ ...searchQuery, [e.target.name]: e.target.value });
  };

  // Handle timeframe selection
  const handleTimeframeChange = (value: string) => {
    setSearchQuery({ 
      ...searchQuery, 
      timeframe: value as 'day' | 'week' | 'month' | 'year' | 'all' 
    });
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.term) {
      toast({
        title: 'Search term required',
        description: 'Please enter a search term to continue',
        variant: 'destructive'
      });
      return;
    }
    search.mutate(searchQuery);
  };

  // Handle person lookup
  const handlePersonLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.term) {
      toast({
        title: 'Name required',
        description: 'Please enter a person name to look up',
        variant: 'destructive'
      });
      return;
    }
    personLookup.mutate(searchQuery.term);
  };

  // Handle company lookup
  const handleCompanyLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.term) {
      toast({
        title: 'Company name required',
        description: 'Please enter a company name to look up',
        variant: 'destructive'
      });
      return;
    }
    companyLookup.mutate(searchQuery.term);
  };

  // Handle sentiment analysis
  const handleSentimentAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.term) {
      toast({
        title: 'Term required',
        description: 'Please enter a term for sentiment analysis',
        variant: 'destructive'
      });
      return;
    }
    analyzeSentiment.mutate({ 
      term: searchQuery.term, 
      platforms: ['twitter', 'reddit', 'facebook'] 
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">OSINT Intelligence</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General Search</TabsTrigger>
            <TabsTrigger value="person">Person Lookup</TabsTrigger>
            <TabsTrigger value="company">Company Lookup</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          </TabsList>
          
          {/* General Search Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General OSINT Search</CardTitle>
                <CardDescription>
                  Search across multiple public sources for information about companies, people, or topics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="term">Search Term</Label>
                    <Input
                      type="text"
                      id="term"
                      name="term"
                      placeholder="Enter keyword, name, domain, etc."
                      value={searchQuery.term}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="timeframe">Time Range</Label>
                      <Select
                        value={searchQuery.timeframe}
                        onValueChange={handleTimeframeChange}
                      >
                        <SelectTrigger id="timeframe">
                          <SelectValue placeholder="Select time range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Last 24 hours</SelectItem>
                          <SelectItem value="week">Last week</SelectItem>
                          <SelectItem value="month">Last month</SelectItem>
                          <SelectItem value="year">Last year</SelectItem>
                          <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="limit">Results Limit</Label>
                      <Input
                        type="number"
                        id="limit"
                        name="limit"
                        min={1}
                        max={100}
                        placeholder="10"
                        value={searchQuery.limit}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Sources</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSources.map((source) => (
                        <div key={source.value} className="flex items-center space-x-2">
                          <Checkbox id={source.value} />
                          <Label htmlFor={source.value} className="font-normal">{source.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  onClick={handleSearch}
                  disabled={search.isPending}
                >
                  {search.isPending ? 'Searching...' : 'Search'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Person Lookup Tab */}
          <TabsContent value="person">
            <Card>
              <CardHeader>
                <CardTitle>Person Lookup</CardTitle>
                <CardDescription>
                  Find information about a person across various public sources.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePersonLookup} className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="personName">Person Name</Label>
                    <Input
                      type="text"
                      id="personName"
                      name="term"
                      placeholder="Enter full name"
                      value={searchQuery.term}
                      onChange={handleInputChange}
                    />
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  onClick={handlePersonLookup}
                  disabled={personLookup.isPending}
                >
                  {personLookup.isPending ? 'Searching...' : 'Lookup Person'}
                </Button>
              </CardFooter>
            </Card>
            
            {personLookup.data && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>{personLookup.data.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {personLookup.data.possibleProfiles && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Possible Profiles</h3>
                      <div className="space-y-2">
                        {personLookup.data.possibleProfiles.map((profile: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{profile.platform}</Badge>
                              <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {profile.url}
                              </a>
                            </div>
                            <Badge variant={profile.confidence > 0.8 ? "default" : "secondary"}>
                              {Math.round(profile.confidence * 100)}% match
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {personLookup.data.emailPatterns && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Possible Email Patterns</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {personLookup.data.emailPatterns.map((email: string, index: number) => (
                          <div key={index} className="p-2 bg-muted rounded-lg">
                            {email}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Company Lookup Tab */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Lookup</CardTitle>
                <CardDescription>
                  Find information about a company across various public sources.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCompanyLookup} className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      type="text"
                      id="companyName"
                      name="term"
                      placeholder="Enter company name"
                      value={searchQuery.term}
                      onChange={handleInputChange}
                    />
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  onClick={handleCompanyLookup}
                  disabled={companyLookup.isPending}
                >
                  {companyLookup.isPending ? 'Searching...' : 'Lookup Company'}
                </Button>
              </CardFooter>
            </Card>
            
            {companyLookup.data && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>{companyLookup.data.name}</CardTitle>
                  {companyLookup.data.website && (
                    <CardDescription>
                      <a href={companyLookup.data.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {companyLookup.data.website}
                      </a>
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {companyLookup.data.socialProfiles && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Social Profiles</h3>
                      <div className="space-y-2">
                        {companyLookup.data.socialProfiles.map((profile: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <Badge variant="outline">{profile.platform}</Badge>
                            <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              {profile.url}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {companyLookup.data.contactInfo && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Contact Information</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(companyLookup.data.contactInfo).map(([key, value]) => (
                          <div key={key} className="p-2 bg-muted rounded-lg">
                            <span className="font-medium">{key}:</span> {value as string}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {companyLookup.data.employees && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Employee Information</h3>
                      <div className="space-y-2">
                        {companyLookup.data.employees.map((emp: any, index: number) => (
                          <div key={index} className="flex justify-between p-2 bg-muted rounded-lg">
                            <span>{emp.title}</span>
                            <Badge variant="secondary">{emp.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Sentiment Analysis Tab */}
          <TabsContent value="sentiment">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Analysis</CardTitle>
                <CardDescription>
                  Analyze sentiment across social media for a keyword, brand, or person.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSentimentAnalysis} className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="sentimentTerm">Term to Analyze</Label>
                    <Input
                      type="text"
                      id="sentimentTerm"
                      name="term"
                      placeholder="Enter brand, person, or keyword"
                      value={searchQuery.term}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Platforms</Label>
                    <div className="flex flex-wrap gap-2">
                      {['twitter', 'reddit', 'facebook'].map((platform) => (
                        <div key={platform} className="flex items-center space-x-2">
                          <Checkbox id={`platform-${platform}`} defaultChecked />
                          <Label htmlFor={`platform-${platform}`} className="font-normal capitalize">{platform}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  onClick={handleSentimentAnalysis}
                  disabled={analyzeSentiment.isPending}
                >
                  {analyzeSentiment.isPending ? 'Analyzing...' : 'Analyze Sentiment'}
                </Button>
              </CardFooter>
            </Card>
            
            {analyzeSentiment.data && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Sentiment Analysis for "{analyzeSentiment.data.term}"</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Overall Sentiment</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
                        <span className="text-xl font-bold text-green-600">
                          {Math.round(analyzeSentiment.data.overallSentiment.positive * 100)}%
                        </span>
                        <span className="text-sm text-muted-foreground">Positive</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
                        <span className="text-xl font-bold text-blue-600">
                          {Math.round(analyzeSentiment.data.overallSentiment.neutral * 100)}%
                        </span>
                        <span className="text-sm text-muted-foreground">Neutral</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-red-50 rounded-lg">
                        <span className="text-xl font-bold text-red-600">
                          {Math.round(analyzeSentiment.data.overallSentiment.negative * 100)}%
                        </span>
                        <span className="text-sm text-muted-foreground">Negative</span>
                      </div>
                    </div>
                  </div>
                  
                  {analyzeSentiment.data.platformSentiment && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Platform Breakdown</h3>
                      <div className="space-y-3">
                        {analyzeSentiment.data.platformSentiment.map((platform: any, index: number) => (
                          <div key={index} className="p-4 bg-muted rounded-lg">
                            <div className="flex justify-between mb-2">
                              <span className="font-medium capitalize">{platform.platform}</span>
                              <span className="text-sm text-muted-foreground">Sample size: {platform.sampleSize}</span>
                            </div>
                            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                              <div className="flex h-full">
                                <div 
                                  className="bg-green-500 h-full" 
                                  style={{ width: `${Math.round(platform.positive * 100)}%` }}
                                  title={`Positive: ${Math.round(platform.positive * 100)}%`}
                                />
                                <div 
                                  className="bg-blue-500 h-full" 
                                  style={{ width: `${Math.round(platform.neutral * 100)}%` }}
                                  title={`Neutral: ${Math.round(platform.neutral * 100)}%`}
                                />
                                <div 
                                  className="bg-red-500 h-full" 
                                  style={{ width: `${Math.round(platform.negative * 100)}%` }}
                                  title={`Negative: ${Math.round(platform.negative * 100)}%`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Top Positive Phrases</h3>
                      <div className="space-y-2">
                        {analyzeSentiment.data.topPositivePhrases.map((phrase: string, index: number) => (
                          <div key={index} className="p-2 bg-green-50 rounded-lg text-green-800">
                            "{phrase}"
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Top Negative Phrases</h3>
                      <div className="space-y-2">
                        {analyzeSentiment.data.topNegativePhrases.map((phrase: string, index: number) => (
                          <div key={index} className="p-2 bg-red-50 rounded-lg text-red-800">
                            "{phrase}"
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Search Results */}
        {activeTab === 'general' && results && results.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Search Results</h2>
            <div className="space-y-4">
              {results.map((result, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle>{result.sourceName}</CardTitle>
                        {result.sourceUrl && (
                          <CardDescription>
                            <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              {result.sourceUrl}
                            </a>
                          </CardDescription>
                        )}
                      </div>
                      <Badge>{result.source}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.source === 'social_media' && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium mb-2">Posts</h3>
                          <div className="space-y-2">
                            {result.data.posts.map((post: any, i: number) => (
                              <div key={i} className="p-3 bg-muted rounded-lg">
                                <div className="flex justify-between mb-1">
                                  <span className="font-medium">@{post.user}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(post.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p>{post.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {result.source === 'news' && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium mb-2">Articles</h3>
                          <div className="space-y-2">
                            {result.data.articles.map((article: any, i: number) => (
                              <div key={i} className="p-3 bg-muted rounded-lg">
                                <div className="flex justify-between mb-1">
                                  <span className="font-medium">{article.title}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(article.publishedAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">Source: {article.source}</p>
                                <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                  Read article
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <div className="flex justify-between w-full text-sm text-muted-foreground">
                      <div>
                        Confidence: {Math.round(result.confidence * 100)}%
                      </div>
                      <div>
                        Relevance: {Math.round(result.relevance * 100)}%
                      </div>
                      <div>
                        {new Date(result.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}