import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  StopCircle,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { ExecutionStatus } from '@shared/schema';

interface ExecutionTimelineProps {
  execution: any;
  nodeExecutions: any[];
  isLoading?: boolean;
}

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ 
  execution, 
  nodeExecutions, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Execution Timeline
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | number | Date) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return format(date, 'MMM d, yyyy HH:mm:ss');
  };

  // Format duration for display
  const formatDuration = (durationMs: number) => {
    if (!durationMs || durationMs <= 0) return 'N/A';
    return formatDistance(0, durationMs, { includeSeconds: true });
  };

  // Create timeline events from execution and node data
  const generateTimelineEvents = () => {
    const events = [];

    // Add execution start event
    if (execution?.startedAt) {
      events.push({
        id: 'execution-start',
        title: 'Execution Started',
        timestamp: execution.startedAt,
        icon: <PlayCircle className="h-5 w-5 text-blue-500" />,
        status: 'info',
        description: `Workflow execution #${execution.id} started`
      });
    }

    // Add node execution events
    if (nodeExecutions && nodeExecutions.length > 0) {
      nodeExecutions.forEach(node => {
        const statusIcon = node.status === ExecutionStatus.COMPLETED ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : node.status === ExecutionStatus.FAILED ? (
          <XCircle className="h-5 w-5 text-red-500" />
        ) : node.status === ExecutionStatus.RUNNING ? (
          <RefreshCw className="h-5 w-5 text-blue-500" />
        ) : node.status === ExecutionStatus.PAUSED ? (
          <PauseCircle className="h-5 w-5 text-yellow-500" />
        ) : node.status === ExecutionStatus.CANCELLED ? (
          <StopCircle className="h-5 w-5 text-orange-500" />
        ) : (
          <Clock className="h-5 w-5 text-gray-500" />
        );

        events.push({
          id: node.id,
          title: `Node: ${node.nodeId}`,
          timestamp: node.startedAt,
          completedAt: node.completedAt,
          icon: statusIcon,
          status: node.status,
          description: `${node.status} ${node.completedAt ? '- completed' : ''}`,
          duration: node.completedAt ? formatDuration(new Date(node.completedAt).getTime() - new Date(node.startedAt).getTime()) : ''
        });
      });
    }

    // Add execution completion event
    if (execution?.completedAt) {
      const statusIcon = execution.status === ExecutionStatus.COMPLETED ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : execution.status === ExecutionStatus.FAILED ? (
        <XCircle className="h-5 w-5 text-red-500" />
      ) : execution.status === ExecutionStatus.CANCELLED ? (
        <StopCircle className="h-5 w-5 text-orange-500" />
      ) : (
        <Clock className="h-5 w-5 text-gray-500" />
      );

      events.push({
        id: 'execution-end',
        title: 'Execution Ended',
        timestamp: execution.completedAt,
        icon: statusIcon,
        status: execution.status,
        description: `Workflow execution ${execution.status}`,
        duration: formatDuration(new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime())
      });
    }

    // Sort events by timestamp
    return events.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  };

  const timelineEvents = generateTimelineEvents();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 h-full w-[2px] bg-gray-200" />

          {/* Timeline events */}
          <div className="space-y-8">
            {timelineEvents.map((event, index) => (
              <div key={event.id} className="relative flex items-start gap-4 pb-8">
                {/* Timeline point */}
                <div className="absolute left-4 -ml-[9px] h-5 w-5 rounded-full border-2 border-background bg-white" />

                {/* Icon */}
                <div className="flex-shrink-0 ml-9">{event.icon}</div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{event.title}</h4>
                    <Badge variant="outline" className={
                      event.status === ExecutionStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                      event.status === ExecutionStatus.FAILED ? 'bg-red-100 text-red-700' :
                      event.status === ExecutionStatus.RUNNING ? 'bg-blue-100 text-blue-700' :
                      event.status === ExecutionStatus.PAUSED ? 'bg-yellow-100 text-yellow-700' :
                      event.status === ExecutionStatus.CANCELLED ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {event.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</p>
                  <p className="text-sm">{event.description}</p>
                  {event.duration && (
                    <p className="text-xs text-muted-foreground">Duration: {event.duration}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutionTimeline;