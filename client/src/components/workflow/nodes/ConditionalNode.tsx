import React, { useCallback, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Code } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
  outputHandle: string;
}

interface ConditionalNodeProps {
  id: string;
  data: {
    label: string;
    conditions: Condition[];
    customCode: string;
    useCustomCode: boolean;
    hasElseCondition: boolean;
    status?: string;
    error?: string;
    isCompact?: boolean;
    onDataChange?: (id: string, data: any) => void;
  };
  selected: boolean;
}

const operators = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'greater than or equal' },
  { value: '<=', label: 'less than or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
  { value: 'isNull', label: 'is null' },
  { value: 'isNotNull', label: 'is not null' },
];

const ConditionalNode: React.FC<ConditionalNodeProps> = ({ id, data, selected }) => {
  const [editMode, setEditMode] = useState(false);
  const isCompact = data.isCompact || !selected;
  
  // Add a new condition
  const addCondition = useCallback(() => {
    const newCondition: Condition = {
      id: `condition-${Date.now()}`,
      field: '',
      operator: '==',
      value: '',
      outputHandle: `output-${Date.now()}`
    };
    
    const updatedConditions = [...data.conditions, newCondition];
    data.onDataChange?.(id, { ...data, conditions: updatedConditions });
  }, [id, data]);
  
  // Remove a condition
  const removeCondition = useCallback((conditionId: string) => {
    const updatedConditions = data.conditions.filter(c => c.id !== conditionId);
    data.onDataChange?.(id, { ...data, conditions: updatedConditions });
  }, [id, data]);
  
  // Update a condition
  const updateCondition = useCallback((conditionId: string, field: string, value: string) => {
    const updatedConditions = data.conditions.map(c => {
      if (c.id === conditionId) {
        return { ...c, [field]: value };
      }
      return c;
    });
    
    data.onDataChange?.(id, { ...data, conditions: updatedConditions });
  }, [id, data]);
  
  // Toggle use of custom code
  const toggleCustomCode = useCallback((checked: boolean) => {
    data.onDataChange?.(id, { ...data, useCustomCode: checked });
  }, [id, data]);
  
  // Update custom code
  const updateCustomCode = useCallback((code: string) => {
    data.onDataChange?.(id, { ...data, customCode: code });
  }, [id, data]);
  
  // Toggle else condition
  const toggleElseCondition = useCallback((checked: boolean) => {
    data.onDataChange?.(id, { ...data, hasElseCondition: checked });
  }, [id, data]);
  
  // Get status color based on node status
  const getStatusColor = () => {
    switch (data.status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-200';
    }
  };
  
  return (
    <Card className={`w-[300px] shadow-md ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge className={`${getStatusColor()} w-2 h-2 rounded-full p-0`} />
            <CardTitle className="text-sm font-medium">{data.label || 'Condition'}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.useCustomCode ? 'Custom Code' : 'Standard'}
          </Badge>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className={`p-3 ${isCompact ? 'max-h-20 overflow-hidden' : ''}`}>
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-2 h-2 bg-blue-500"
        />
        
        {isCompact ? (
          <div className="text-xs text-gray-500">
            {data.conditions.length} condition{data.conditions.length !== 1 ? 's' : ''}
            {data.hasElseCondition && ', with else path'}
            {data.useCustomCode && ', using custom code'}
          </div>
        ) : (
          <Tabs defaultValue="conditions" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="conditions" className="flex-1">Conditions</TabsTrigger>
              <TabsTrigger value="code" className="flex-1">Custom Code</TabsTrigger>
            </TabsList>
            
            <TabsContent value="conditions" className="py-2">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useCustomCode">Use Custom Code</Label>
                  <Switch
                    id="useCustomCode"
                    checked={data.useCustomCode}
                    onCheckedChange={toggleCustomCode}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="hasElseCondition">Add Else Path</Label>
                  <Switch
                    id="hasElseCondition"
                    checked={data.hasElseCondition}
                    onCheckedChange={toggleElseCondition}
                  />
                </div>
                
                {data.conditions.map((condition, index) => (
                  <div key={condition.id} className="space-y-2 p-2 border rounded-md">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">Condition {index + 1}</Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeCondition(condition.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor={`field-${condition.id}`} className="text-xs">Field</Label>
                      <Input
                        id={`field-${condition.id}`}
                        value={condition.field}
                        onChange={(e) => updateCondition(condition.id, 'field', e.target.value)}
                        placeholder="context.data.fieldName"
                        className="h-7 text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor={`operator-${condition.id}`} className="text-xs">Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(condition.id, 'operator', value)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map(op => (
                            <SelectItem key={op.value} value={op.value} className="text-xs">
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor={`value-${condition.id}`} className="text-xs">Value</Label>
                      <Input
                        id={`value-${condition.id}`}
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                        placeholder="Value to compare against"
                        className="h-7 text-xs"
                      />
                    </div>
                    
                    {/* Output Handle for each condition */}
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={condition.outputHandle}
                      className="w-2 h-2 bg-green-500"
                      style={{ top: `${25 + (index * 100)}px` }}
                    />
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addCondition}
                  className="w-full flex items-center justify-center mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
                
                {/* Else Output Handle - only if hasElseCondition is true */}
                {data.hasElseCondition && (
                  <>
                    <div className="p-2 border rounded-md bg-gray-50">
                      <div className="flex items-center">
                        <Badge variant="outline" className="text-xs">Else</Badge>
                      </div>
                    </div>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id="else"
                      className="w-2 h-2 bg-orange-500"
                      style={{ top: `${25 + (data.conditions.length * 100)}px` }}
                    />
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="code" className="py-2">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Code className="h-4 w-4" />
                  <Label htmlFor="customCode" className="text-sm">Custom Conditional Logic</Label>
                </div>
                <Textarea
                  id="customCode"
                  value={data.customCode}
                  onChange={(e) => updateCustomCode(e.target.value)}
                  placeholder="// Return the output handle ID to route to
function condition(input) {
  if (input.value > 10) {
    return 'output-1';
  } else if (input.value < 5) {
    return 'output-2';
  }
  return 'else';
}"
                  className="font-mono text-xs"
                  rows={12}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        {/* Error Message */}
        {data.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {data.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConditionalNode;