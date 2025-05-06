import React from 'react';
import { useRoute } from 'wouter';
import { WorkflowExecutionDetails } from '@/components/workflow/WorkflowExecutionDetails';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { AppLayout } from '@/layouts/AppLayout';

const WorkflowExecutionPage: React.FC = () => {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/workflow-executions/:id');
  
  if (!match || !params.id) {
    return (
      <AppLayout title="Execution Not Found">
        <div className="container mx-auto py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <h1 className="text-2xl font-bold mb-4">Execution Not Found</h1>
            <p className="text-muted-foreground mb-6">The execution you're looking for doesn't exist or the ID is invalid.</p>
            <Button onClick={() => navigate('/workflows')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workflows
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  const executionId = parseInt(params.id);
  
  return (
    <AppLayout title="Workflow Execution">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Workflow Execution</h1>
          <p className="text-muted-foreground">View and manage the execution of a workflow</p>
        </div>
        
        <WorkflowExecutionDetails 
          executionId={executionId} 
          onBack={() => navigate('/workflows')} 
        />
      </div>
    </AppLayout>
  );
};

export default WorkflowExecutionPage;