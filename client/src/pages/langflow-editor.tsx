import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Settings,
  CheckCircle,
  RefreshCw,
  Server,
  RotateCw,
  Link,
  Copy,
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

const LangflowEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState('connection');
  const [apiUrl, setApiUrl] = useState('http://localhost:7860');
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

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

  // Handle save connection settings
  const handleSaveConnection = () => {
    // In a real implementation, this would update the API URL via an API call
    toast({
      title: "Connection Updated",
      description: "Langflow connection settings have been updated",
    });
    refetchStatus();
  };

  // Handle copy iframe code
  const handleCopyIframe = () => {
    const iframeCode = `<iframe src="${apiUrl}" width="100%" height="800" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(iframeCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Iframe code copied to clipboard",
        variant: "default",
      });
    });
  };

  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-8 flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Langflow Editor</h1>
          <p className="text-muted-foreground">
            Configure and manage your Langflow connection
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/ai/langflow">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </a>
          </Button>
          {langflowStatus?.available && (
            <Button asChild>
              <a href={langflowStatus.api_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Langflow
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl">
            <Server className="h-5 w-5 mr-2" />
            Langflow Server Status
          </CardTitle>
          <CardDescription>
            Connection details and availability of your Langflow instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {statusError || !langflowStatus?.available ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>
                  Cannot connect to Langflow. Please check your connection settings.
                </AlertDescription>
              </Alert>
            ) : langflowStatus?.available ? (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Connected</AlertTitle>
                <AlertDescription>
                  Successfully connected to Langflow v{langflowStatus.version}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div>
                <h3 className="text-sm font-medium mb-3">Connection Details</h3>
                <dl className="grid grid-cols-[1fr_2fr] gap-2 text-sm">
                  <dt className="font-medium text-muted-foreground">Status:</dt>
                  <dd className="flex items-center">
                    {isLoadingStatus ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : langflowStatus?.available ? (
                      <span className="text-green-500 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" /> Operational
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" /> Unavailable
                      </span>
                    )}
                  </dd>

                  <dt className="font-medium text-muted-foreground">API URL:</dt>
                  <dd>{langflowStatus?.api_url || "Not connected"}</dd>

                  <dt className="font-medium text-muted-foreground">Version:</dt>
                  <dd>{langflowStatus?.version || "Unknown"}</dd>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Available Features</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    {langflowStatus?.features?.components ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                    )}
                    Component Discovery
                  </li>
                  <li className="flex items-center">
                    {langflowStatus?.features?.visualization ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                    )}
                    Workflow Visualization
                  </li>
                  <li className="flex items-center">
                    {langflowStatus?.features?.execution ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                    )}
                    Workflow Execution
                  </li>
                  <li className="flex items-center">
                    {langflowStatus?.features?.conversion ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                    )}
                    Format Conversion
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => refetchStatus()}>
                <RotateCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="embed">Embed</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connection" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>
                Configure the connection to your Langflow instance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="api-url">Langflow API URL</Label>
                <Input
                  id="api-url"
                  placeholder="http://localhost:7860"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The URL where your Langflow instance is hosted
                </p>
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="api-key">API Key (Optional)</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your Langflow API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If your Langflow instance requires authentication
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveConnection}>
                  <Settings className="h-4 w-4 mr-2" />
                  Save Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="embed" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Embed Langflow</CardTitle>
              <CardDescription>
                Integrate Langflow directly into your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="iframe-code">Iframe Embed Code</Label>
                <div className="relative">
                  <Input
                    id="iframe-code"
                    readOnly
                    value={`<iframe src="${apiUrl}" width="100%" height="800" frameborder="0"></iframe>`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1"
                    onClick={handleCopyIframe}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this code to embed Langflow in an iframe on your website
                </p>
              </div>
              
              <div className="rounded-md border p-4 mt-4">
                <h3 className="text-sm font-medium mb-2">Direct Integration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  For deeper integration with SynthralOS, use the API endpoints:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <Link className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
                    <div>
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/langflow/status</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Check connection status and available features
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Link className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
                    <div>
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/langflow/components</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Get available Langflow components
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Link className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
                    <div>
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/langflow/convert/to-langflow/:id</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Convert SynthralOS workflow to Langflow format
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Configure advanced Langflow integration options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Advanced settings will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LangflowEditor;