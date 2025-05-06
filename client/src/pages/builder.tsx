import React, { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import WorkflowCanvas from '@/components/workflow/WorkflowCanvas';
import { 
  fetchWorkflow, 
  updateWorkflow, 
  createWorkflow, 
  Workflow, 
  Node, 
  Edge,
  getNodesFromWorkflow,
  getEdgesFromWorkflow
} from '@/lib/workflow';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/BackButton';
import { Save } from 'lucide-react';
import { Link } from 'wouter';

const Builder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  // Fetch workflow if id is provided
  const { data: workflow, isLoading, error } = useQuery({
    queryKey: ['/api/workflows', id],
    queryFn: () => fetchWorkflow(parseInt(id || '0')),
    enabled: !!id,
  });
  
  // Update workflow mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Workflow>) => {
      if (id) {
        return updateWorkflow(parseInt(id), data);
      }
      throw new Error('No workflow ID provided');
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/workflows', id] });
      toast({
        title: 'Workflow Saved',
        description: 'Your workflow has been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to save workflow: ${error}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update nodes and edges when workflow data is loaded
  useEffect(() => {
    if (workflow) {
      setNodes(getNodesFromWorkflow(workflow));
      setEdges(getEdgesFromWorkflow(workflow));
    }
  }, [workflow]);
  
  // Create workflow mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Workflow>) => createWorkflow(data),
    onSuccess: (newWorkflow: Workflow) => {
      // Redirect to the new workflow's edit page
      window.location.href = `/builder/${newWorkflow.id}`;
      toast({
        title: 'Workflow Created',
        description: 'Your new workflow has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create workflow: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Handle save
  const handleSave = (nodes: Node[], edges: Edge[]) => {
    if (id) {
      // Update existing workflow
      updateMutation.mutate({
        data: { nodes, edges }
      });
    } else {
      // Create new workflow
      createMutation.mutate({
        name: 'New Workflow',
        description: 'A workflow created in the visual builder',
        data: { nodes, edges },
        isPublic: false,
        tags: ['custom'],
      });
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-destructive">{String(error)}</p>
            <BackButton href="/dashboard" className="mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col">
      <div className="bg-card border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard" />
          <h1 className="text-xl font-semibold">{workflow?.name || 'New Workflow'}</h1>
        </div>
        
        <Button 
          onClick={() => handleSave(nodes, edges)}
          disabled={updateMutation.isPending || createMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {id ? 'Save Workflow' : 'Create Workflow'}
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden" style={{ width: '100%', height: 'calc(100vh - 70px)' }}>
        <WorkflowCanvas
          initialNodes={nodes}
          initialEdges={edges}
          onSave={handleSave}
        />
      </div>
    </div>
  );
};

export default Builder;