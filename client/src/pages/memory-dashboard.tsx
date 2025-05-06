import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Database, Brain, NetworkIcon, Zap, BookOpen, HardDrive, AlertCircle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { MemoryType } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { queryClient } from '@/lib/queryClient';

interface MemorySystem {
  id: number;
  type: MemoryType;
  name: string;
  description: string;
  userId: number;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MemoryStats {
  Context7: number;
  Mem0: number;
  Graphiti: number;
  Zep: number;
  LlamaIndex: number;
}

interface MemoryEntry {
  id: number;
  systemId: number;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  source?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface MemorySearchResult {
  id: number;
  systemId: number;
  content: string;
  metadata: Record<string, any>;
  score: number;
  memoryType: MemoryType;
  systemName: string;
  createdAt: string;
}

export default function MemoryDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMemorySystem, setActiveMemorySystem] = useState<MemoryType | 'all'>('all');
  const [memoryResults, setMemoryResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // Get memory systems
  const { data: memorySystems = [], isLoading: systemsLoading, error: systemsError } = useQuery({
    queryKey: ['/api/memory/systems'],
  });
  
  // Get memory statistics
  const { data: memoryStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/memory/stats'],
  });

  // Memory system icons based on type
  function getMemorySystemIcon(type: MemoryType) {
    switch (type) {
      case MemoryType.Context7:
        return <Zap className="h-6 w-6 text-yellow-500" />;
      case MemoryType.Mem0:
        return <Database className="h-6 w-6 text-blue-500" />;
      case MemoryType.Graphiti:
        return <NetworkIcon className="h-6 w-6 text-green-500" />;
      case MemoryType.Zep:
        return <Brain className="h-6 w-6 text-purple-500" />;
      case MemoryType.LlamaIndex:
        return <BookOpen className="h-6 w-6 text-orange-500" />;
      default:
        return <HardDrive className="h-6 w-6 text-slate-500" />;
    }
  }

  // Format memory systems for display
  const formattedMemorySystems = memorySystems.map((system: any) => ({
    ...system,
    icon: getMemorySystemIcon(system.type),
    status: system.isActive ? 'active' : 'inactive',
    entryCount: memoryStats ? memoryStats[system.type] || 0 : 0,
    lastUpdated: system.updatedAt ? formatDistanceToNow(new Date(system.updatedAt), { addSuffix: true }) : 'Unknown'
  }));

  // Search mutation
  const searchMemoryMutation = useMutation({
    mutationFn: async (query: { query: string; memoryType?: MemoryType }) => {
      const response = await fetch('/api/memory/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });
      
      if (!response.ok) {
        throw new Error('Failed to search memory');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setMemoryResults(data);
      setIsSearching(false);
    },
    onError: (error) => {
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'Failed to search memory systems',
        variant: 'destructive',
      });
      setIsSearching(false);
    }
  });

  // Handle memory search
  const handleMemorySearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    const query: { query: string; memoryType?: MemoryType } = {
      query: searchQuery,
    };
    
    // If a specific memory system is selected, add it to the query
    if (activeMemorySystem !== 'all') {
      query.memoryType = activeMemorySystem;
    }
    
    searchMemoryMutation.mutate(query);
  };

  return (
    <AppLayout title="Memory Dashboard">
      <div className="p-6 h-full overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Memory Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Explore and search across all agent memory systems
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8 border border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Memory Search</CardTitle>
            <CardDescription>
              Search for information across memory systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search memory systems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button onClick={handleMemorySearch} disabled={isSearching}>
                {isSearching ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Memory Systems Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {memorySystems.map((system) => (
            <Card 
              key={system.id} 
              className={`border border-slate-200 dark:border-slate-700 ${
                activeMemorySystem === system.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {system.icon}
                    <CardTitle className="text-lg">{system.name}</CardTitle>
                  </div>
                  <Badge variant={system.status === 'active' ? 'default' : 'outline'}>
                    {system.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 mt-2">
                  {system.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Entries</p>
                    <p className="text-lg font-medium">{system.entryCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Last Updated</p>
                    <p className="text-sm">{system.lastUpdated}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveMemorySystem(system.id)}
                >
                  {activeMemorySystem === system.id ? 'Currently Selected' : 'Select'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Memory Content Viewer */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Memory Contents</CardTitle>
            <CardDescription>
              View and explore memory entries from selected system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {memoryResults.length > 0 ? (
              <div className="space-y-4">
                {memoryResults.map((result) => (
                  <div 
                    key={result.id} 
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{result.system}</Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(result.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {Math.round(result.similarity * 100)}% Match
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{result.content}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.metadata.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <HardDrive className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">
                  {searchQuery 
                    ? 'No results found. Try a different search term.' 
                    : 'Search above to view memory contents.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}