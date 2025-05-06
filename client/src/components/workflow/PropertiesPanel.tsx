import React, { useState, useMemo } from 'react';
import { Node, Edge } from '@/lib/workflow';
import { nodeDefinitions, nodeSchemas, NodeType } from '@/lib/node-types';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Info } from 'lucide-react';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeDataUpdate: (nodeId: string, data: any) => void;
  readOnly?: boolean;
}

// Component to render empty panel
const EmptyPanel = () => (
  <div className="w-[300px] h-full border-l border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 p-6 text-center">
    <div>
      <Info className="h-10 w-10 mx-auto mb-4 opacity-30" />
      <p>Select a node or edge to view and edit its properties</p>
    </div>
  </div>
);

// Component to render edge properties
const EdgeProperties = ({ edge }: { edge: Edge }) => (
  <div className="w-[300px] h-full border-l border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
    <h3 className="text-lg font-medium mb-4">Edge Properties</h3>
    <div className="space-y-4">
      <div>
        <Label>Edge ID</Label>
        <Input value={edge.id} readOnly disabled />
      </div>
      <div>
        <Label>Source</Label>
        <Input value={edge.source} readOnly disabled />
      </div>
      <div>
        <Label>Target</Label>
        <Input value={edge.target} readOnly disabled />
      </div>
      <div>
        <Label>Source Handle</Label>
        <Input value={edge.sourceHandle || 'default'} readOnly disabled />
      </div>
      <div>
        <Label>Target Handle</Label>
        <Input value={edge.targetHandle || 'default'} readOnly disabled />
      </div>
    </div>
  </div>
);

// Component to render node properties
const NodeProperties = ({ 
  node, 
  onNodeDataUpdate, 
  readOnly = false 
}: { 
  node: Node, 
  onNodeDataUpdate: (nodeId: string, data: any) => void, 
  readOnly?: boolean 
}) => {
  const [activeTab, setActiveTab] = useState('properties');
  
  const nodeType = node.type as NodeType;
  const nodeDef = nodeDefinitions[nodeType];
  
  // Check if node definition exists
  if (!nodeDef) {
    return (
      <div className="w-[300px] h-full border-l border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
        <h3 className="text-lg font-medium mb-4">Node Properties</h3>
        <p className="text-red-500">Unknown node type: {nodeType}</p>
      </div>
    );
  }
  
  // Create dynamic schema for the node
  const dynamicSchema = useMemo(() => z.object({
    label: z.string().min(1, "Label is required"),
    description: z.string().optional(),
    // Add more fields based on the node type's schema
    ...Object.entries(node.data || {})
      .filter(([key]) => !['label', 'type', 'description', 'icon'].includes(key))
      .reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = z.string().optional();
        } else if (typeof value === 'number') {
          acc[key] = z.number().optional();
        } else if (typeof value === 'boolean') {
          acc[key] = z.boolean().optional();
        } else if (Array.isArray(value)) {
          acc[key] = z.array(z.any()).optional();
        } else if (typeof value === 'object') {
          acc[key] = z.object({}).passthrough().optional();
        }
        return acc;
      }, {} as Record<string, any>)
  }), [node.data, nodeType]);

  // Create form with default values
  const form = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      label: node.data?.label || nodeDef.label,
      description: node.data?.description || nodeDef.description,
      ...Object.entries(node.data || {})
        .filter(([key]) => !['label', 'type', 'description', 'icon'].includes(key))
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>)
    }
  });

  const handleSubmit = (values: any) => {
    if (readOnly) return;
    onNodeDataUpdate(node.id, values);
  };

  return (
    <div className="w-[300px] h-full border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-700 p-3">
        <h3 className="text-lg font-medium">{nodeDef.label}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{nodeDef.description}</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <TabsList className="h-10 w-full justify-start px-3">
            <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
            <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="properties" className="flex-1 overflow-y-auto p-4">
          <Form {...form}>
            <form
              onChange={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  {...form.register('label')}
                  disabled={readOnly}
                />
                {form.formState.errors.label && (
                  <p className="text-xs text-red-500 mt-1">
                    {form.formState.errors.label.message as string}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  disabled={readOnly}
                />
              </div>
              
              {/* Generate form fields dynamically based on data */}
              {Object.entries(node.data || {})
                .filter(([key]) => !['label', 'type', 'description', 'icon'].includes(key))
                .map(([key, value]) => {
                  // Handle different types of inputs
                  if (typeof value === 'boolean') {
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={key} className="cursor-pointer">
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Label>
                        <Switch
                          id={key}
                          checked={form.getValues(key as any) as boolean}
                          onCheckedChange={(checked) => {
                            form.setValue(key as any, checked, { shouldDirty: true });
                          }}
                          disabled={readOnly}
                        />
                      </div>
                    );
                  }
                  
                  if (typeof value === 'number') {
                    return (
                      <div key={key}>
                        <Label htmlFor={key}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Label>
                        <Input
                          id={key}
                          type="number"
                          {...form.register(key as any, { valueAsNumber: true })}
                          disabled={readOnly}
                        />
                      </div>
                    );
                  }
                  
                  if (Array.isArray(value) && typeof value[0] === 'string') {
                    // Simple string array editor
                    return (
                      <div key={key}>
                        <Label htmlFor={key}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Label>
                        <Textarea
                          id={key}
                          value={value.join('\n')}
                          onChange={(e) => {
                            const arrayValue = e.target.value.split('\n').filter(Boolean);
                            form.setValue(key as any, arrayValue, { shouldDirty: true });
                          }}
                          placeholder="One item per line"
                          disabled={readOnly}
                        />
                      </div>
                    );
                  }
                  
                  // Default to string input
                  return (
                    <div key={key}>
                      <Label htmlFor={key}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Label>
                      <Input
                        id={key}
                        {...form.register(key as any)}
                        disabled={readOnly}
                      />
                    </div>
                  );
                })}
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="info" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <Label>Node Type</Label>
              <p className="mt-1 text-sm text-slate-500">{nodeType}</p>
            </div>
            <div>
              <Label>Category</Label>
              <p className="mt-1 text-sm text-slate-500">{nodeDef.category}</p>
            </div>
            <div>
              <Label>Inputs</Label>
              <p className="mt-1 text-sm text-slate-500">{nodeDef.inputs}</p>
            </div>
            <div>
              <Label>Outputs</Label>
              <p className="mt-1 text-sm text-slate-500">{nodeDef.outputs}</p>
            </div>
            <div>
              <Label>Node ID</Label>
              <p className="mt-1 text-sm text-slate-500">{node.id}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Main panel component that selects the correct panel to display
// Fixed to avoid conditional hooks
const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  selectedEdge,
  onNodeDataUpdate,
  readOnly = false,
}) => {
  // Determine which panel to render based on selection
  let panelContent: JSX.Element;
  
  if (!selectedNode && !selectedEdge) {
    panelContent = <EmptyPanel />;
  } else if (selectedEdge) {
    panelContent = <EdgeProperties edge={selectedEdge} />;
  } else if (selectedNode) {
    panelContent = (
      <NodeProperties 
        node={selectedNode} 
        onNodeDataUpdate={onNodeDataUpdate} 
        readOnly={readOnly} 
      />
    );
  } else {
    panelContent = <EmptyPanel />;
  }
  
  // Return the panel content
  return panelContent;
};

export default PropertiesPanel;