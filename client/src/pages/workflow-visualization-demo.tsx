import React from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import WorkflowVisualizationDemo from '@/components/workflow/WorkflowVisualizationDemo';

export default function WorkflowVisualizationDemoPage() {
  return (
    <AppLayout>
      <div className="h-full p-4">
        <h1 className="text-2xl font-bold mb-4">Interactive Workflow Visualization Demo</h1>
        <p className="mb-6 text-muted-foreground">
          This demo showcases the interactive flow animations for workflow execution. 
          Use the controls above to simulate different execution states.
        </p>
        <div className="h-[calc(100vh-13rem)]">
          <WorkflowVisualizationDemo />
        </div>
      </div>
    </AppLayout>
  );
}