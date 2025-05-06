import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Archive, 
  ArrowRightCircle, 
  Bell, 
  Calendar, 
  Code, 
  Database, 
  File, 
  FileText, 
  Filter, 
  Flag, 
  Folder, 
  Globe, 
  Grid, 
  HelpCircle, 
  Image, 
  Mail, 
  MessageSquare, 
  PauseCircle, 
  PlayCircle, 
  Repeat, 
  Search, 
  Server, 
  Settings, 
  Share2, 
  Shuffle, 
  SplitSquareHorizontal, 
  Terminal, 
  Timer, 
  Upload, 
  User, 
  Users, 
  Variable, 
  Webhook, 
  Workflow,
  BrainCircuit,
  Bot,
  ScanText,
  FileJson,
  FileCode,
  type LucideIcon
} from 'lucide-react';

// Map of icon names to Lucide icon components
export const iconMap: Record<string, LucideIcon> = {
  Activity,
  Archive,
  ArrowRightCircle,
  Bell,
  Calendar,
  Code,
  Database,
  File,
  FileText,
  Filter,
  Flag,
  Folder,
  Globe,
  Grid,
  HelpCircle,
  Image,
  Mail,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Repeat,
  Search,
  Server,
  Settings,
  Share2,
  Shuffle,
  SplitSquareHorizontal,
  Terminal,
  Timer,
  Upload,
  User,
  Users,
  Variable,
  Webhook,
  Workflow,
  BrainCircuit,
  Bot,
  ScanText,
  FileJson,
  FileCode
};

const CustomNode: React.FC<NodeProps> = ({ id, data, isConnectable }) => {
  const { inputs = 1, outputs = 1 } = data;
  
  // Get the icon component based on the icon name in data
  // Fall back to HelpCircle if the icon name is not found
  const IconComponent = data.icon ? iconMap[data.icon] || iconMap.HelpCircle : iconMap.HelpCircle;

  return (
    <div className="relative">
      {/* Input handles */}
      {Array.from({ length: inputs }).map((_, i) => (
        <Handle
          key={`input-${i}`}
          type="target"
          position={Position.Left}
          id={`input-${i}`}
          className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white"
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
          className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white"
          style={{ top: `${((i + 1) * 100) / (outputs + 1)}%` }}
          isConnectable={isConnectable}
        />
      ))}

      <Card className="shadow-md w-[200px]">
        <CardHeader className="py-2 px-3 flex flex-row items-center gap-2 border-b">
          <div className="text-primary">
            <IconComponent className="h-5 w-5" />
          </div>
          <CardTitle className="text-sm flex-1">{data.label}</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3 text-xs text-slate-500">
          <p>{data.description || 'No description available'}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomNode;