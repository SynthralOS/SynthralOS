import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  CheckCircle2, 
  LucideIcon,
  CircleSlash,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Copy,
  Settings,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { iconMap } from './CustomNode';
import { NodeDefinition } from '@/lib/node-types';

const EnhancedNode: React.FC<NodeProps> = ({ id, data, isConnectable, selected }) => {
  const [expanded, setExpanded] = useState(true);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'disabled'>('idle');
  const [isHovered, setIsHovered] = useState(false);
  const { inputs = 1, outputs = 1 } = data;
  const reactflow = useReactFlow();

  // Set node status based on data
  useEffect(() => {
    if (data.status) {
      setStatus(data.status);
    }
  }, [data.status]);

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  const handleDelete = () => {
    reactflow.deleteElements({ nodes: [{ id }] });
  };

  const handleDuplicate = () => {
    const node = reactflow.getNode(id);
    if (node) {
      const position = {
        x: node.position.x + 20,
        y: node.position.y + 20,
      };
      const newNode = {
        ...node,
        id: `${id}-copy-${Date.now()}`,
        position,
        selected: false,
      };
      reactflow.addNodes(newNode);
    }
  };

  // Icon based on status
  const getStatusIcon = (): JSX.Element => {
    switch (status) {
      case 'running':
        return <motion.div 
                  initial={{ scale: 1 }} 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-blue-500"
                >
                  <Play size={14} />
                </motion.div>;
      case 'success':
        return <CheckCircle2 size={14} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'disabled':
        return <CircleSlash size={14} className="text-gray-500" />;
      default:
        return <div className="w-3.5 h-3.5"></div>;
    }
  };

  // Get node icon - make sure to handle cases where the icon doesn't exist
  const IconComponent = data.icon && iconMap[data.icon] ? iconMap[data.icon] : iconMap.HelpCircle;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative"
    >
      {/* Highlight effects when selected */}
      {selected && (
        <div className="absolute -inset-1 rounded-lg border-2 border-primary border-dashed" />
      )}

      {/* Input handles */}
      {Array.from({ length: inputs }).map((_, i) => (
        <Handle
          key={`input-${i}`}
          type="target"
          position={Position.Left}
          id={`input-${i}`}
          className={`w-3 h-3 rounded-full border-2 bg-background ${
            selected ? 'border-primary' : 'border-slate-400'
          } transition-all hover:w-4 hover:h-4 hover:border-primary`}
          style={{ top: `${((i + 1) * 100) / (inputs + 1)}%` }}
          isConnectable={isConnectable}
        />
      ))}

      {/* Output handles */}
      {Array.from({ length: outputs }).map((_, i) => (
        <Handle
          key={`output-${i}`}
          type="source"
          position={Position.Right}
          id={`output-${i}`}
          className={`w-3 h-3 rounded-full border-2 bg-background ${
            selected ? 'border-primary' : 'border-slate-400'
          } transition-all hover:w-4 hover:h-4 hover:border-primary`}
          style={{ top: `${((i + 1) * 100) / (outputs + 1)}%` }}
          isConnectable={isConnectable}
        />
      ))}

      <Card 
        className={`shadow-md w-[220px] transition-all ${
          selected ? 'ring-2 ring-primary ring-offset-1' : ''
        } ${status === 'running' ? 'animate-pulse-subtle' : ''}`}
      >
        <CardHeader className="py-2 px-3 flex flex-row items-center gap-2 border-b">
          <div className="text-primary">
            <IconComponent className="h-5 w-5" />
          </div>
          
          <CardTitle className="text-sm flex-1 flex items-center gap-1">
            {data.label}
            <div className="ml-1">{getStatusIcon()}</div>
          </CardTitle>
          
          <div className="flex items-center">
            <button 
              className="p-0.5 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={handleToggleExpand}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-0.5 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-700 ml-1">
                  <MoreHorizontal className="h-4 w-4 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel className="text-xs">Node Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDuplicate} className="text-xs cursor-pointer">
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs cursor-pointer">
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  Configure
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-xs text-red-500 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        {expanded && (
          <CardContent className="py-2 px-3 text-xs text-slate-500">
            <div className="overflow-hidden">
              <p>{data.description || 'No description available'}</p>
              
              {data.properties && (
                <div className="mt-2 space-y-1">
                  {Object.entries(data.properties).map(([key, value]) => (
                    <div key={key} className="flex items-center">
                      <span className="font-medium text-slate-600 dark:text-slate-400 mr-1">{key}:</span>
                      <span className="truncate">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}

        <CardFooter className="p-2 border-t flex justify-between">
          <Badge 
            variant="outline" 
            className="text-[10px] h-5 px-1 font-normal bg-slate-50 dark:bg-slate-800"
          >
            {data.category}
          </Badge>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center text-[10px] text-slate-500">
                  <span>{inputs} in</span>
                  <span className="mx-1">→</span>
                  <span>{outputs} out</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">This node accepts {inputs} input{inputs !== 1 ? 's' : ''} and produces {outputs} output{outputs !== 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EnhancedNode;