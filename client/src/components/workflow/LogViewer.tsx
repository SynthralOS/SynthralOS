import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Info, 
  AlertCircle, 
  AlertTriangle, 
  Bug, 
  RefreshCw, 
  Search,
  Download,
  Loader2,
  Filter,
  X
} from 'lucide-react';
import { LogLevel } from '@shared/schema';

interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

interface LogViewerProps {
  logs: LogEntry[];
  isLoading?: boolean;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs = [], isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Get unique sources for filtering
  const uniqueSources = Array.from(new Set(logs.map(log => log.source || 'unknown')));

  // Handle level icon/color display
  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'info':
        return <Badge className="bg-blue-500"><Info className="h-3 w-3 mr-1" /> Info</Badge>;
      case 'error':
        return <Badge className="bg-red-500"><AlertCircle className="h-3 w-3 mr-1" /> Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" /> Warning</Badge>;
      case 'debug':
        return <Badge className="bg-gray-500"><Bug className="h-3 w-3 mr-1" /> Debug</Badge>;
      default:
        return <Badge className="bg-gray-500">{level}</Badge>;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Execution Logs
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter logs based on search and level filter
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.source && log.source.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLevel = levelFilter === 'all' || 
      (log.level && log.level.toLowerCase() === levelFilter.toLowerCase());
    
    const matchesSource = sourceFilter === 'all' || 
      (log.source && log.source === sourceFilter);
    
    return matchesSearch && matchesLevel && matchesSource;
  });

  // Handle log export
  const handleExportLogs = () => {
    const exportData = filteredLogs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      source: log.source || 'unknown',
      message: log.message
    }));
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Execution Logs
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {filteredLogs.length} log entries
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportLogs}
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
            {searchTerm && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute right-0 top-0 h-full"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          
          {uniqueSources.length > 0 && (
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md border">
          {filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Level</TableHead>
                  <TableHead className="w-[120px]">Source</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>{getLevelBadge(log.level)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.source || 'unknown'}
                    </TableCell>
                    <TableCell className="whitespace-pre-wrap">
                      {log.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              {searchTerm || levelFilter !== 'all' || sourceFilter !== 'all' ? (
                <div className="text-center">
                  <Filter className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p>No logs match your filters</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSearchTerm('');
                      setLevelFilter('all');
                      setSourceFilter('all');
                    }}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Info className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p>No logs available for this execution</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LogViewer;