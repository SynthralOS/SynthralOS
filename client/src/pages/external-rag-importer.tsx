import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RagType } from '@shared/schema';
import { 
  Database, RefreshCcw, Upload, Download, File, FileText, 
  Link, Github, Folder, HardDrive, Check, AlertTriangle, 
  BookOpen, Globe, FileImage, FileArchive, RotateCcw
} from 'lucide-react';

// Supported import source types
enum ImportSourceType {
  File = 'file',
  Url = 'url',
  GitRepo = 'git_repo',
  Text = 'text',
  Api = 'api'
}

// Supported file types
enum FileType {
  PDF = 'pdf',
  TXT = 'txt',
  DOCX = 'docx',
  CSV = 'csv',
  MD = 'md',
  JSON = 'json',
  HTML = 'html',
  XML = 'xml'
}

const FileTypeIcons: Record<FileType, React.ReactNode> = {
  [FileType.PDF]: <FileText className="w-5 h-5 text-red-500" />,
  [FileType.TXT]: <File className="w-5 h-5 text-gray-500" />,
  [FileType.DOCX]: <FileText className="w-5 h-5 text-blue-500" />,
  [FileType.CSV]: <FileText className="w-5 h-5 text-green-500" />,
  [FileType.MD]: <FileText className="w-5 h-5 text-purple-500" />,
  [FileType.JSON]: <FileText className="w-5 h-5 text-yellow-500" />,
  [FileType.HTML]: <Globe className="w-5 h-5 text-orange-500" />,
  [FileType.XML]: <FileText className="w-5 h-5 text-pink-500" />
};

export default function ExternalRagImporter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for import configuration
  const [sourceType, setSourceType] = useState<ImportSourceType>(ImportSourceType.File);
  const [targetRagId, setTargetRagId] = useState<string>('');
  const [importName, setImportName] = useState('');
  const [fileType, setFileType] = useState<FileType>(FileType.PDF);
  const [fileUrl, setFileUrl] = useState('');
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [gitRepoBranch, setGitRepoBranch] = useState('main');
  const [gitRepoPath, setGitRepoPath] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiHeaders, setApiHeaders] = useState('');
  const [apiBody, setApiBody] = useState('');
  const [directText, setDirectText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // Chunking settings
  const [chunkSize, setChunkSize] = useState(512);
  const [overlapSize, setOverlapSize] = useState(50);
  const [shouldPreprocess, setShouldPreprocess] = useState(true);
  const [processingOptions, setProcessingOptions] = useState({
    removeTables: false,
    removeImages: true,
    removeFormatting: true,
    extractMetadata: true,
    convertLinks: true
  });

  // State for import status
  const [importOperationId, setImportOperationId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('source');
  
  // Fetch RAG systems
  const { data: ragSystems, isLoading: isLoadingRagSystems } = useQuery({
    queryKey: ['/api/rag/systems'],
    retry: false,
  });
  
  // Fetch import status
  const { data: importStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/rag/import/status', importOperationId],
    enabled: !!importOperationId,
    refetchInterval: importOperationId ? 1000 : false, // Poll every second if there's an active operation
    retry: false,
  });
  
  // Fetch recent imports
  const { data: recentImports, isLoading: isLoadingRecentImports } = useQuery({
    queryKey: ['/api/rag/imports'],
    retry: false,
  });
  
  // Start import mutation
  const startImport = useMutation({
    mutationFn: async () => {
      let importData: any = {
        targetRagId: Number(targetRagId),
        name: importName,
        chunkSize,
        overlapSize,
        preprocess: shouldPreprocess,
        preprocessingOptions: processingOptions
      };
      
      if (sourceType === ImportSourceType.File) {
        if (uploadedFiles.length === 0) {
          throw new Error('Please upload at least one file');
        }
        
        const formData = new FormData();
        uploadedFiles.forEach(file => {
          formData.append('files', file);
        });
        
        // Append the import configuration as JSON
        formData.append('importConfig', JSON.stringify(importData));
        
        // Special case for file uploads - use FormData
        const response = await fetch('/api/rag/import/files', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload files');
        }
        
        return await response.json();
      } else {
        // Add source-specific data
        if (sourceType === ImportSourceType.Url) {
          importData.sourceType = 'url';
          importData.url = fileUrl;
          importData.fileType = fileType;
        } else if (sourceType === ImportSourceType.GitRepo) {
          importData.sourceType = 'git_repo';
          importData.repoUrl = gitRepoUrl;
          importData.branch = gitRepoBranch;
          importData.path = gitRepoPath;
        } else if (sourceType === ImportSourceType.Api) {
          importData.sourceType = 'api';
          importData.apiUrl = apiUrl;
          importData.method = apiMethod;
          importData.headers = apiHeaders ? JSON.parse(apiHeaders) : {};
          importData.body = apiBody ? JSON.parse(apiBody) : undefined;
        } else if (sourceType === ImportSourceType.Text) {
          importData.sourceType = 'text';
          importData.content = directText;
        }
        
        const response = await apiRequest('POST', '/api/rag/import', importData);
        return await response.json();
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Import started',
        description: `Successfully initiated import: ${data.operationId}`,
      });
      
      setImportOperationId(data.operationId);
      setCurrentTab('status');
      
      // Refetch imports after a successful import
      queryClient.invalidateQueries({ queryKey: ['/api/rag/imports'] });
    },
    onError: (error) => {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  });
  
  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prevFiles => [...prevFiles, ...filesArray]);
    }
  };
  
  // Remove uploaded file
  const removeFile = (index: number) => {
    setUploadedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  // Get file type label
  const getFileTypeLabel = (type: FileType) => {
    switch(type) {
      case FileType.PDF: return 'PDF Document';
      case FileType.TXT: return 'Text File';
      case FileType.DOCX: return 'Word Document';
      case FileType.CSV: return 'CSV Spreadsheet';
      case FileType.MD: return 'Markdown';
      case FileType.JSON: return 'JSON Data';
      case FileType.HTML: return 'HTML Page';
      case FileType.XML: return 'XML Document';
      default: return type;
    }
  };
  
  // Get import source label
  const getSourceTypeLabel = (type: ImportSourceType) => {
    switch(type) {
      case ImportSourceType.File: return 'File Upload';
      case ImportSourceType.Url: return 'URL / Web Page';
      case ImportSourceType.GitRepo: return 'Git Repository';
      case ImportSourceType.Text: return 'Direct Text Input';
      case ImportSourceType.Api: return 'API Endpoint';
      default: return type;
    }
  };
  
  // Render source input based on source type
  const renderSourceInput = () => {
    switch(sourceType) {
      case ImportSourceType.File:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button onClick={() => document.getElementById('file-upload')?.click()} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedFiles.map((file, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{file.name}</TableCell>
                        <TableCell>{(file.size / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>
                          {file.type || `${FileType[file.name.split('.').pop()?.toUpperCase() as any]}`}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeFile(index)}
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Remove</span>
                            <Upload className="h-4 w-4 rotate-180" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {uploadedFiles.length === 0 && (
              <div className="border border-dashed rounded-md p-8 text-center">
                <FileArchive className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No files uploaded</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Drag and drop files here, or click the button above to upload
                </p>
              </div>
            )}
          </div>
        );
      
      case ImportSourceType.Url:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-input">URL</Label>
              <Input
                id="url-input"
                placeholder="https://example.com/document.pdf"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a direct link to a document or webpage to import
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="file-type">File Type</Label>
              <Select value={fileType} onValueChange={(value) => setFileType(value as FileType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select file type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(FileType).map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {FileTypeIcons[type]}
                        <span>{getFileTypeLabel(type)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the type of file you're importing, or auto-detect from URL
              </p>
            </div>
          </div>
        );
      
      case ImportSourceType.GitRepo:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input
                id="repo-url"
                placeholder="https://github.com/username/repo"
                value={gitRepoUrl}
                onChange={(e) => setGitRepoUrl(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="repo-branch">Branch</Label>
                <Input
                  id="repo-branch"
                  placeholder="main"
                  value={gitRepoBranch}
                  onChange={(e) => setGitRepoBranch(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="repo-path">Folder Path (Optional)</Label>
                <Input
                  id="repo-path"
                  placeholder="docs/"
                  value={gitRepoPath}
                  onChange={(e) => setGitRepoPath(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Github className="w-4 h-4" />
              <span>Only public repositories are supported for now</span>
            </div>
          </div>
        );
      
      case ImportSourceType.Api:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">API Endpoint</Label>
              <Input
                id="api-url"
                placeholder="https://api.example.com/data"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="api-method">Method</Label>
                <Select value={apiMethod} onValueChange={setApiMethod}>
                  <SelectTrigger id="api-method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file-type">Response Type</Label>
                <Select value={fileType} onValueChange={(value) => setFileType(value as FileType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select response type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FileType.JSON}>JSON</SelectItem>
                    <SelectItem value={FileType.XML}>XML</SelectItem>
                    <SelectItem value={FileType.TXT}>Plain Text</SelectItem>
                    <SelectItem value={FileType.HTML}>HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-headers">Headers (JSON format)</Label>
              <Textarea
                id="api-headers"
                placeholder='{"Authorization": "Bearer token"}'
                value={apiHeaders}
                onChange={(e) => setApiHeaders(e.target.value)}
                className="h-20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-body">Request Body (JSON format)</Label>
              <Textarea
                id="api-body"
                placeholder='{"query": "example"}'
                value={apiBody}
                onChange={(e) => setApiBody(e.target.value)}
                className="h-20"
              />
            </div>
          </div>
        );
      
      case ImportSourceType.Text:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="direct-text">Text Content</Label>
              <Textarea
                id="direct-text"
                placeholder="Enter text to import directly..."
                value={directText}
                onChange={(e) => setDirectText(e.target.value)}
                className="min-h-[300px]"
              />
              <p className="text-xs text-muted-foreground">
                Directly enter text content to import into the RAG system
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Render processing options
  const renderProcessingOptions = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="preprocess-switch"
            checked={shouldPreprocess}
            onCheckedChange={setShouldPreprocess}
          />
          <Label htmlFor="preprocess-switch">Enable preprocessing</Label>
        </div>
        
        {shouldPreprocess && (
          <div className="space-y-4 border rounded-md p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remove-tables"
                  checked={processingOptions.removeTables}
                  onCheckedChange={(checked) => 
                    setProcessingOptions({...processingOptions, removeTables: checked as boolean})
                  }
                />
                <Label htmlFor="remove-tables">Remove tables</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remove-images"
                  checked={processingOptions.removeImages}
                  onCheckedChange={(checked) => 
                    setProcessingOptions({...processingOptions, removeImages: checked as boolean})
                  }
                />
                <Label htmlFor="remove-images">Remove images</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remove-formatting"
                  checked={processingOptions.removeFormatting}
                  onCheckedChange={(checked) => 
                    setProcessingOptions({...processingOptions, removeFormatting: checked as boolean})
                  }
                />
                <Label htmlFor="remove-formatting">Remove formatting</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="extract-metadata"
                  checked={processingOptions.extractMetadata}
                  onCheckedChange={(checked) => 
                    setProcessingOptions({...processingOptions, extractMetadata: checked as boolean})
                  }
                />
                <Label htmlFor="extract-metadata">Extract metadata</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="convert-links"
                  checked={processingOptions.convertLinks}
                  onCheckedChange={(checked) => 
                    setProcessingOptions({...processingOptions, convertLinks: checked as boolean})
                  }
                />
                <Label htmlFor="convert-links">Convert links to references</Label>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label htmlFor="chunk-size">Chunk Size: {chunkSize} tokens</Label>
              <span className="text-xs text-muted-foreground">{getChunkSizeDescription(chunkSize)}</span>
            </div>
            <Slider
              id="chunk-size"
              min={128}
              max={2048}
              step={64}
              value={[chunkSize]}
              onValueChange={(values) => setChunkSize(values[0])}
              className="w-full"
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label htmlFor="overlap-size">Chunk Overlap: {overlapSize} tokens</Label>
              <span className="text-xs text-muted-foreground">
                {Math.round((overlapSize / chunkSize) * 100)}% of chunk size
              </span>
            </div>
            <Slider
              id="overlap-size"
              min={0}
              max={chunkSize / 2}
              step={8}
              value={[overlapSize]}
              onValueChange={(values) => setOverlapSize(values[0])}
              className="w-full"
            />
          </div>
        </div>
      </div>
    );
  };
  
  // Get chunk size description
  const getChunkSizeDescription = (size: number): string => {
    if (size <= 256) return 'Small - Better for precise retrieval';
    if (size <= 512) return 'Medium - Good balance for most content';
    if (size <= 1024) return 'Large - Better for context retention';
    return 'Very Large - Maximum context at cost of precision';
  };
  
  // Check if the form is valid
  const isFormValid = (): boolean => {
    if (!targetRagId) return false;
    if (!importName.trim()) return false;
    
    switch (sourceType) {
      case ImportSourceType.File:
        return uploadedFiles.length > 0;
      case ImportSourceType.Url:
        return !!fileUrl && !!fileType;
      case ImportSourceType.GitRepo:
        return !!gitRepoUrl && !!gitRepoBranch;
      case ImportSourceType.Api:
        return !!apiUrl && !!apiMethod && !!fileType;
      case ImportSourceType.Text:
        return !!directText.trim();
      default:
        return false;
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">External RAG Importer</h1>
        <p className="text-muted-foreground">
          Import documents from external sources into your RAG system
        </p>
      </div>
      
      <Separator className="my-6" />
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="source">Import Source</TabsTrigger>
          <TabsTrigger value="settings">Settings & Processing</TabsTrigger>
          <TabsTrigger value="status">Import Status</TabsTrigger>
        </TabsList>
        
        <TabsContent value="source" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Target RAG System</CardTitle>
              <CardDescription>Select the RAG system to import documents into</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRagSystems ? (
                <div className="flex items-center justify-center h-24">
                  <RefreshCcw className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-rag">RAG System</Label>
                    <Select value={targetRagId} onValueChange={setTargetRagId}>
                      <SelectTrigger id="target-rag">
                        <SelectValue placeholder="Select a RAG system" />
                      </SelectTrigger>
                      <SelectContent>
                        {ragSystems && ragSystems.map((system: any) => (
                          <SelectItem key={system.id} value={system.id.toString()}>
                            {system.name} ({system.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="import-name">Import Name</Label>
                    <Input
                      id="import-name"
                      placeholder="My Document Import"
                      value={importName}
                      onChange={(e) => setImportName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A name to identify this import operation
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Source Type</CardTitle>
              <CardDescription>Select the source type for the documents you want to import</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={sourceType} 
                onValueChange={(value) => setSourceType(value as ImportSourceType)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {Object.values(ImportSourceType).map((type) => (
                  <div key={type} className={`flex items-center space-x-2 border rounded-md p-4 ${sourceType === type ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value={type} id={`source-type-${type}`} />
                    <Label htmlFor={`source-type-${type}`} className="flex items-center gap-2 font-medium cursor-pointer">
                      {type === ImportSourceType.File && <Upload className="w-4 h-4" />}
                      {type === ImportSourceType.Url && <Link className="w-4 h-4" />}
                      {type === ImportSourceType.GitRepo && <Github className="w-4 h-4" />}
                      {type === ImportSourceType.Api && <Database className="w-4 h-4" />}
                      {type === ImportSourceType.Text && <FileText className="w-4 h-4" />}
                      {getSourceTypeLabel(type)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Source Configuration</CardTitle>
              <CardDescription>Configure the import source details</CardDescription>
            </CardHeader>
            <CardContent>
              {renderSourceInput()}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentTab('settings')}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setCurrentTab('settings')}
                disabled={!targetRagId || !importName.trim()}
              >
                Next: Configure Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Settings</CardTitle>
              <CardDescription>Configure how documents are processed and chunked</CardDescription>
            </CardHeader>
            <CardContent>
              {renderProcessingOptions()}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentTab('source')}
              >
                Back to Source
              </Button>
              <Button
                onClick={() => startImport.mutate()}
                disabled={!isFormValid() || startImport.isPending}
              >
                {startImport.isPending ? (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Start Import
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="status" className="space-y-6">
          {importOperationId ? (
            <Card>
              <CardHeader>
                <CardTitle>Import Operation</CardTitle>
                <CardDescription>
                  Operation ID: <code className="text-xs bg-muted p-1 rounded">{importOperationId}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {importStatus ? (
                  <>
                    <div className="border rounded-md p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium">Status:</div>
                        {importStatus.status === 'pending' && (
                          <Badge variant="outline" className="border-slate-500 text-slate-500">Pending</Badge>
                        )}
                        {importStatus.status === 'processing' && (
                          <Badge variant="default" className="bg-blue-500">Processing</Badge>
                        )}
                        {importStatus.status === 'completed' && (
                          <Badge variant="default" className="bg-green-500">Completed</Badge>
                        )}
                        {importStatus.status === 'failed' && (
                          <Badge variant="default" className="bg-red-500">Failed</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-medium">Progress:</div>
                          <div className="text-sm">{importStatus.progress}%</div>
                        </div>
                        <Progress value={importStatus.progress} className="h-2" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="text-sm font-medium">Documents Processed:</div>
                        <div className="text-sm">
                          {importStatus.documentsProcessed} / {importStatus.totalDocuments}
                        </div>
                        
                        <div className="text-sm font-medium">Chunks Created:</div>
                        <div className="text-sm">{importStatus.chunksCreated}</div>
                        
                        <div className="text-sm font-medium">Start Time:</div>
                        <div className="text-sm">
                          {new Date(importStatus.startTime).toLocaleString()}
                        </div>
                        
                        {importStatus.endTime && (
                          <>
                            <div className="text-sm font-medium">End Time:</div>
                            <div className="text-sm">
                              {new Date(importStatus.endTime).toLocaleString()}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {importStatus.errors.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-medium text-red-500">Errors:</div>
                          <ul className="text-sm space-y-1">
                            {importStatus.errors.map((error: string, i: number) => (
                              <li key={i} className="flex items-start space-x-1">
                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="text-red-500">{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {importStatus.warnings.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-medium text-yellow-500">Warnings:</div>
                          <ul className="text-sm space-y-1">
                            {importStatus.warnings.map((warning: string, i: number) => (
                              <li key={i} className="flex items-start space-x-1">
                                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span className="text-yellow-500">{warning}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {(importStatus.status === 'completed' || importStatus.status === 'failed') && (
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setImportOperationId(null);
                            setCurrentTab('source');
                          }}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Start New Import
                        </Button>
                        {importStatus.status === 'failed' && (
                          <Button 
                            onClick={() => startImport.mutate()}
                            disabled={startImport.isPending}
                          >
                            Retry Import
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-24">
                    <RefreshCcw className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
              <h3 className="text-lg font-semibold">No Active Import</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Start a new import operation to see status here
              </p>
              <Button variant="outline" onClick={() => setCurrentTab('source')}>
                Start New Import
              </Button>
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Imports</CardTitle>
              <CardDescription>History of recent document imports</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRecentImports ? (
                <div className="flex items-center justify-center h-24">
                  <RefreshCcw className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : recentImports && recentImports.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Target RAG</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentImports.map((importItem: any) => (
                        <TableRow key={importItem.id}>
                          <TableCell className="font-medium">{importItem.name}</TableCell>
                          <TableCell>
                            {importItem.status === 'completed' && (
                              <Badge variant="default" className="bg-green-500">Completed</Badge>
                            )}
                            {importItem.status === 'failed' && (
                              <Badge variant="default" className="bg-red-500">Failed</Badge>
                            )}
                            {importItem.status === 'processing' && (
                              <Badge variant="default" className="bg-blue-500">Processing</Badge>
                            )}
                            {importItem.status === 'pending' && (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>{importItem.documentCount}</TableCell>
                          <TableCell>{importItem.targetRagName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(importItem.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <HardDrive className="mx-auto h-10 w-10 opacity-50 mb-2" />
                  <p>No import history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}