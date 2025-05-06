import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

export interface Workflow {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  isPublic: boolean;
  data: any;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: number;
  workflowId: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  logs?: any;
  result?: any;
}

export interface WorkflowTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  data: any;
  createdAt: string;
  updatedAt: string;
}

export interface ApiIntegration {
  id: number;
  userId: number;
  service: string;
  name: string;
  config: any;
  createdAt: string;
  updatedAt: string;
}

// Workflow API
export async function getWorkflows(): Promise<Workflow[]> {
  const res = await apiRequest("GET", "/api/workflows");
  return res.json();
}

export async function getWorkflow(id: number): Promise<Workflow> {
  const res = await apiRequest("GET", `/api/workflows/${id}`);
  return res.json();
}

export async function createWorkflow(workflow: Omit<Workflow, "id" | "ownerId" | "createdAt" | "updatedAt">): Promise<Workflow> {
  const res = await apiRequest("POST", "/api/workflows", workflow);
  const newWorkflow = await res.json();
  
  // Invalidate the workflows cache
  queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
  
  return newWorkflow;
}

export async function updateWorkflow(id: number, workflow: Partial<Workflow>): Promise<Workflow> {
  const res = await apiRequest("PUT", `/api/workflows/${id}`, workflow);
  const updatedWorkflow = await res.json();
  
  // Invalidate the workflows cache and the specific workflow
  queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
  queryClient.invalidateQueries({ queryKey: [`/api/workflows/${id}`] });
  
  return updatedWorkflow;
}

export async function deleteWorkflow(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/workflows/${id}`);
  
  // Invalidate the workflows cache
  queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
}

// Workflow Execution API
export async function getWorkflowExecutions(workflowId: number): Promise<WorkflowExecution[]> {
  const res = await apiRequest("GET", `/api/workflows/${workflowId}/executions`);
  return res.json();
}

export async function executeWorkflow(workflowId: number): Promise<WorkflowExecution> {
  const res = await apiRequest("POST", `/api/workflows/${workflowId}/execute`);
  const execution = await res.json();
  
  // Invalidate the executions cache for this workflow
  queryClient.invalidateQueries({ queryKey: [`/api/workflows/${workflowId}/executions`] });
  
  return execution;
}

// API Integration API
export async function getApiIntegrations(): Promise<ApiIntegration[]> {
  const res = await apiRequest("GET", "/api/integrations");
  return res.json();
}

export async function createApiIntegration(integration: Omit<ApiIntegration, "id" | "userId" | "createdAt" | "updatedAt">): Promise<ApiIntegration> {
  const res = await apiRequest("POST", "/api/integrations", integration);
  const newIntegration = await res.json();
  
  // Invalidate the integrations cache
  queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
  
  return newIntegration;
}

// Workflow Template API
export async function getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const res = await apiRequest("GET", "/api/templates");
  return res.json();
}

export async function getWorkflowTemplate(id: number): Promise<WorkflowTemplate> {
  const res = await apiRequest("GET", `/api/templates/${id}`);
  return res.json();
}

// Subscription API
export async function createSubscription(): Promise<{ clientSecret: string; subscriptionId: string }> {
  const res = await apiRequest("POST", "/api/get-or-create-subscription");
  return res.json();
}
