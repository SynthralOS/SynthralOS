import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LangflowComponents from '@/components/langflow/LangflowComponents';
import LangflowConverter from '@/components/langflow/LangflowConverter';
import { 
  AlertCircle, 
  Settings, 
  ListTree, 
  ArrowLeftRight, 
  RefreshCw, 
  Check 
} from 'lucide-react';

interface LangflowStatusResponse {
  status: 'operational' | 'unavailable';
  available: boolean;
  version: string;
  api_url: string;
  features: {
    components: boolean;
    visualization: boolean;
    execution: boolean;
    conversion: boolean;
  };
  nodeTypes: {
    llm: string[];
    chains: string[];
    agents: string[];
    memory: string[];
    tools: string[];
    vectorStores: string[];
  };
}

const LangflowSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('components');

  // Query for Langflow status
  const { 
    data: langflowStatus, 
    isLoading: isLoadingStatus, 
    error: statusError,
    refetch: refetchStatus 
  } = useQuery<LangflowStatusResponse>({ 
    queryKey: ['/api/langflow/status'],
    retry: false,
  });

  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Langflow Settings</h1>
        <p className="text-muted-foreground">
          Configure and manage Langflow integration with SynthralOS
        </p>
      </div>

      {/* Connection status */}
      <div className="mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Connection Status</h2>
                <p className="text-muted-foreground">
                  {isLoadingStatus 
                    ? 'Checking Langflow connection...'
                    : langflowStatus?.available
                      ? `Connected to Langflow (v${langflowStatus.version})`
                      : 'Not connected to Langflow'
                  }
                </p>
                {langflowStatus?.api_url && (
                  <p className="text-xs text-muted-foreground mt-1">
                    API URL: {langflowStatus.api_url}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {isLoadingStatus ? (
                  <div className="flex items-center">
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin text-muted-foreground" />
                    Checking...
                  </div>
                ) : langflowStatus?.available ? (
                  <div className="flex items-center text-green-600">
                    <Check className="h-5 w-5 mr-2" />
                    Connected
                  </div>
                ) : (
                  <div className="flex items-center text-amber-600">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Not Connected
                  </div>
                )}
                
                <Button variant="outline" onClick={() => refetchStatus()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                
                <Button asChild>
                  <a href="/ai/langflow-editor">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature alerts */}
      {!langflowStatus?.available && !isLoadingStatus && (
        <Alert className="mb-8" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Langflow Not Connected</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              The Langflow connection is not available. Some features will be limited or unavailable.
            </p>
            <Button asChild>
              <a href="/ai/langflow-editor">
                Configure Langflow Connection
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Feature tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="components" className="flex gap-2">
            <ListTree className="h-4 w-4" />
            Components
          </TabsTrigger>
          <TabsTrigger value="converter" className="flex gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Format Converter
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="components" className="p-0">
          <LangflowComponents />
        </TabsContent>
        
        <TabsContent value="converter" className="p-0">
          <LangflowConverter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LangflowSettings;