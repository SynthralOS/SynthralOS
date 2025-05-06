import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLangChainOperations } from '@/hooks/useLangChainOperations';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * A component for testing LangChain functionalities
 */
const LangChainTester = () => {
  const { toast } = useToast();
  const [operationType, setOperationType] = useState<'llm-chain' | 'agent'>('llm-chain');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  
  const {
    executeLLMChain,
    isExecutingLLMChain,
    llmChainError,
    
    executeAgent,
    isExecutingAgent,
    agentError,
    
    availableTools,
    isLoadingTools
  } = useLangChainOperations();
  
  const isLoading = isExecutingLLMChain || isExecutingAgent;
  
  const handleSubmit = async () => {
    try {
      setResult(null);
      
      if (operationType === 'llm-chain') {
        const response = await executeLLMChain({
          promptTemplate: 'You are a helpful assistant. Answer the following: {input}',
          input: prompt,
          options: {
            temperature: 0.7,
            model: 'anthropic' // Using Claude as default
          }
        });
        
        setResult(response.result);
        toast({
          title: 'LLM Chain executed successfully',
          description: `Execution took ${response.timeTaken.toFixed(2)} seconds`,
        });
      } else if (operationType === 'agent') {
        // Default tools for testing
        const tools = ['web-search', 'calculator', 'weather'];
        
        const response = await executeAgent({
          systemMessage: 'You are a helpful assistant with access to tools. Use them to help answer questions.',
          tools,
          query: prompt,
          options: {
            temperature: 0.2,
            verbose: true
          }
        });
        
        setResult(response.result);
        toast({
          title: 'Agent executed successfully',
          description: `Execution took ${response.timeTaken.toFixed(2)} seconds`,
        });
      }
    } catch (error: any) {
      console.error('Error executing LangChain operation:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred during execution',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>LangChain Tester</CardTitle>
        <CardDescription>
          Test LangChain capabilities with different prompts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="operation-type">Operation Type</Label>
          <Select
            value={operationType}
            onValueChange={(value: any) => setOperationType(value)}
          >
            <SelectTrigger id="operation-type">
              <SelectValue placeholder="Select operation type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="llm-chain">LLM Chain</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="prompt">{operationType === 'llm-chain' ? 'Prompt' : 'Question for Agent'}</Label>
          <Textarea
            id="prompt"
            placeholder={operationType === 'llm-chain' 
              ? "Enter your prompt here..." 
              : "Ask a question that might require tools..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
        </div>
        
        {result && (
          <div className="space-y-2">
            <Label htmlFor="result">Result</Label>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-700 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
              {result}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !prompt}
          className="w-full"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Executing...' : 'Execute'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LangChainTester;