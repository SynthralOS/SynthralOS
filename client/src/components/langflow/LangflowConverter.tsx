import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeftRight, 
  ExternalLink, 
  Download, 
  Upload, 
  RefreshCw, 
  FileJson, 
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

interface ConvertToLangflowResponse {
  id?: string;
  name: string;
  description?: string;
  data: any;
}

interface ConvertFromLangflowResponse {
  id?: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
}

const LangflowConverter: React.FC = () => {
  const { toast } = useToast();
  const [workflowId, setWorkflowId] = useState('');
  const [langflowId, setLangflowId] = useState('');
  const [workflowJson, setWorkflowJson] = useState('');
  const [langflowJson, setLangflowJson] = useState('');
  const [workflowName, setWorkflowName] = useState('Converted Workflow');
  const [conversionDirection, setConversionDirection] = useState<'toLanguage' | 'fromLanguage'>('toLanguage');
  const [copied, setCopied] = useState(false);

  // Mutation for converting to Langflow
  const convertToLangflowMutation = useMutation({
    mutationFn: async (data: { workflowId: string }) => {
      return apiRequest('POST', `/api/langflow/convert/to-langflow/${data.workflowId}`);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setLangflowJson(JSON.stringify(data, null, 2));
      toast({
        title: "Conversion Successful",
        description: "Workflow successfully converted to Langflow format",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert workflow to Langflow format",
        variant: "destructive",
      });
    }
  });

  // Mutation for converting from Langflow
  const convertFromLangflowMutation = useMutation({
    mutationFn: async (data: { langflowId: string }) => {
      return apiRequest('POST', `/api/langflow/convert/from-langflow/${data.langflowId}`);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setWorkflowJson(JSON.stringify(data, null, 2));
      toast({
        title: "Conversion Successful",
        description: "Langflow workflow successfully converted to SynthralOS format",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert from Langflow format",
        variant: "destructive",
      });
    }
  });

  // Mutation for syncing workflow
  const syncWorkflowMutation = useMutation({
    mutationFn: async (data: { workflowId: string; langflowId: string }) => {
      return apiRequest('POST', `/api/langflow/sync`, data);
    },
    onSuccess: async (response) => {
      toast({
        title: "Sync Successful",
        description: "Workflow successfully synced with Langflow",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync workflow with Langflow",
        variant: "destructive",
      });
    }
  });

  // Handle convert button click
  const handleConvert = () => {
    if (conversionDirection === 'toLanguage') {
      if (!workflowId) {
        toast({
          title: "Missing Workflow ID",
          description: "Please enter a SynthralOS workflow ID to convert",
          variant: "destructive",
        });
        return;
      }
      convertToLangflowMutation.mutate({ workflowId });
    } else {
      if (!langflowId) {
        toast({
          title: "Missing Langflow ID",
          description: "Please enter a Langflow workflow ID to convert",
          variant: "destructive",
        });
        return;
      }
      convertFromLangflowMutation.mutate({ langflowId });
    }
  };

  // Handle sync button click
  const handleSync = () => {
    if (!workflowId || !langflowId) {
      toast({
        title: "Missing IDs",
        description: "Please enter both SynthralOS and Langflow workflow IDs to sync",
        variant: "destructive",
      });
      return;
    }
    syncWorkflowMutation.mutate({ workflowId, langflowId });
  };

  // Handle copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "JSON copied to clipboard",
        variant: "default",
      });
    });
  };

  // Handle manual JSON conversion
  const handleManualJsonConvert = () => {
    try {
      // Parse the input JSON
      const parsedJson = JSON.parse(
        conversionDirection === 'toLanguage' ? workflowJson : langflowJson
      );
      
      // Set the result (in a real implementation, this would call an API)
      if (conversionDirection === 'toLanguage') {
        // Convert SynthralOS format to Langflow format
        setLangflowJson(JSON.stringify({
          id: "converted-" + Date.now(),
          name: workflowName,
          description: "Converted from SynthralOS",
          data: parsedJson
        }, null, 2));
      } else {
        // Convert Langflow format to SynthralOS format
        setWorkflowJson(JSON.stringify({
          nodes: parsedJson.nodes || [],
          edges: parsedJson.edges || [],
          name: parsedJson.name || workflowName,
          description: parsedJson.description || "Converted from Langflow"
        }, null, 2));
      }
      
      toast({
        title: "Conversion Successful",
        description: "JSON successfully converted",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Conversion Failed",
        description: "Invalid JSON format. Please check your input.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ArrowLeftRight className="h-5 w-5 mr-2" />
          Workflow Format Converter
        </CardTitle>
        <CardDescription>
          Convert workflows between SynthralOS and Langflow formats
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="byId" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="byId">Convert by ID</TabsTrigger>
            <TabsTrigger value="byJson">Convert JSON</TabsTrigger>
          </TabsList>
          
          <TabsContent value="byId" className="space-y-4 mt-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label htmlFor="workflowId">SynthralOS Workflow ID</Label>
                  <Input
                    id="workflowId"
                    value={workflowId}
                    onChange={(e) => setWorkflowId(e.target.value)}
                    placeholder="Enter workflow ID"
                  />
                </div>
                
                <div className="mt-6">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setConversionDirection(prev => 
                      prev === 'toLanguage' ? 'fromLanguage' : 'toLanguage'
                    )}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1">
                  <Label htmlFor="langflowId">Langflow Workflow ID</Label>
                  <Input
                    id="langflowId"
                    value={langflowId}
                    onChange={(e) => setLangflowId(e.target.value)}
                    placeholder="Enter Langflow ID"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleConvert}
                  className="flex-1"
                  disabled={convertToLangflowMutation.isPending || convertFromLangflowMutation.isPending}
                >
                  {(convertToLangflowMutation.isPending || convertFromLangflowMutation.isPending) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">Convert</span>
                      {conversionDirection === 'toLanguage' ? 'to Langflow' : 'from Langflow'}
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleSync}
                  disabled={syncWorkflowMutation.isPending}
                >
                  {syncWorkflowMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Workflows
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="byJson" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <Label htmlFor="workflowName" className="flex-shrink-0">Workflow Name:</Label>
              <Input
                id="workflowName"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Enter workflow name"
                className="max-w-xs"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setConversionDirection(prev => 
                  prev === 'toLanguage' ? 'fromLanguage' : 'toLanguage'
                )}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center mb-2">
                  <FileJson className="h-4 w-4 mr-2" />
                  SynthralOS Format
                </Label>
                <div className="relative">
                  <Textarea
                    value={workflowJson}
                    onChange={(e) => setWorkflowJson(e.target.value)}
                    placeholder="Paste SynthralOS workflow JSON here"
                    rows={15}
                    className="font-mono text-xs"
                    disabled={conversionDirection === 'fromLanguage'}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/50"
                    onClick={() => handleCopy(workflowJson)}
                    disabled={!workflowJson}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="flex items-center mb-2">
                  <FileJson className="h-4 w-4 mr-2" />
                  Langflow Format
                </Label>
                <div className="relative">
                  <Textarea
                    value={langflowJson}
                    onChange={(e) => setLangflowJson(e.target.value)}
                    placeholder="Paste Langflow workflow JSON here"
                    rows={15}
                    className="font-mono text-xs"
                    disabled={conversionDirection === 'toLanguage'}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/50"
                    onClick={() => handleCopy(langflowJson)}
                    disabled={!langflowJson}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            <Button onClick={handleManualJsonConvert} className="w-full">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Convert {conversionDirection === 'toLanguage' ? 'to Langflow' : 'from Langflow'} Format
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Remember to validate converted workflows before running
        </div>
        
        <Button variant="outline" size="sm" asChild>
          <a href="http://localhost:7860" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-2" />
            Open Langflow
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LangflowConverter;