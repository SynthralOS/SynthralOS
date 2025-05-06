import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Star, 
  Clock, 
  Tag,
  Filter,
  HelpCircle
} from 'lucide-react';
import { NodeType, NodeCategory, nodeDefinitions, NodeDefinition } from '@/lib/node-types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { iconMap } from './CustomNode';

interface NodeItemProps {
  node: NodeDefinition & { nodeType: NodeType };
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: NodeType) => void;
  isFavorite: boolean;
  onToggleFavorite: (nodeType: NodeType) => void;
}

// Component for displaying individual nodes in the panel
const NodeItem: React.FC<NodeItemProps> = ({ node, onDragStart, isFavorite, onToggleFavorite }) => {
  const [isDragging, setIsDragging] = useState(false);
  const IconComponent = node.icon && iconMap[node.icon] ? iconMap[node.icon] : HelpCircle;

  // Handle drag start with custom handler
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true);
    onDragStart(event, node.nodeType);
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Render the node item
  return (
    <div 
      className={`p-2 rounded-md text-sm transition-all relative ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      }`}
    >
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="group cursor-grab bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-3 hover:border-primary hover:shadow-sm transition-all"
      >
        <div className="flex items-center">
          {node.icon && (
            <div className="mr-2 text-primary dark:text-primary-foreground">
              <IconComponent className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1">
            <div className="font-medium flex items-center">
              {node.label}
              {node.inputs > 0 && node.outputs > 0 && (
                <Badge variant="outline" className="ml-2 px-1 text-[10px]">
                  {node.inputs}➝{node.outputs}
                </Badge>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {node.description}
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(node.nodeType);
                  }}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-2 text-slate-400 hover:text-amber-400"
                >
                  <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

// Main component for the node panel
const NodePanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<NodeType[]>(() => {
    const saved = localStorage.getItem('favoriteNodes');
    return saved ? JSON.parse(saved) : [];
  });
  const [recentNodes, setRecentNodes] = useState<NodeType[]>(() => {
    const saved = localStorage.getItem('recentNodes');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('favoriteNodes', JSON.stringify(favorites));
  }, [favorites]);

  // Save recent nodes to localStorage
  useEffect(() => {
    localStorage.setItem('recentNodes', JSON.stringify(recentNodes));
  }, [recentNodes]);

  // Group nodes by category for the panel display
  const nodesByCategory = Object.entries(nodeDefinitions).reduce((acc, [nodeType, nodeDef]) => {
    const category = nodeDef.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ nodeType: nodeType as NodeType, ...nodeDef });
    return acc;
  }, {} as Record<string, Array<NodeDefinition & { nodeType: NodeType }>>);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Toggle favorite status
  const toggleFavorite = (nodeType: NodeType) => {
    setFavorites(prev => {
      if (prev.includes(nodeType)) {
        return prev.filter(type => type !== nodeType);
      } else {
        return [...prev, nodeType];
      }
    });
  };

  // Add to recent nodes
  const addToRecentNodes = (nodeType: NodeType) => {
    setRecentNodes(prev => {
      // Move to top if exists, otherwise add at top
      const withoutCurrent = prev.filter(type => type !== nodeType);
      return [nodeType, ...withoutCurrent].slice(0, 10); // Keep only 10 most recent
    });
  };

  // Filter nodes based on search query and active filters
  const filterNodes = (nodes: Array<NodeDefinition & { nodeType: NodeType }>) => {
    let filtered = nodes;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(node => 
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category filters if any
    if (activeFilters.length > 0) {
      filtered = filtered.filter(node => activeFilters.includes(node.category));
    }
    
    return filtered;
  };

  // Handle drag start for node
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: NodeType) => {
    // Make sure we have a valid node type before proceeding
    if (!nodeType || !nodeDefinitions[nodeType]) {
      console.error('Invalid node type for drag:', nodeType);
      return;
    }
    
    // Set the node type in the dataTransfer object
    try {
      event.dataTransfer.setData('application/reactflow/type', nodeType);
      event.dataTransfer.effectAllowed = 'move';
      
      // Add preview image for drag - with error handling
      try {
        const previewElement = document.createElement('div');
        previewElement.className = 'node-drag-preview';
        previewElement.textContent = nodeDefinitions[nodeType].label || 'Node';
        previewElement.style.padding = '8px';
        previewElement.style.background = 'white';
        previewElement.style.border = '1px solid #ccc';
        previewElement.style.borderRadius = '4px';
        previewElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        previewElement.style.position = 'absolute';
        previewElement.style.top = '-1000px'; // Hide it outside the viewport
        
        document.body.appendChild(previewElement);
        event.dataTransfer.setDragImage(previewElement, 50, 30);
        
        // Clean up the preview element after drag
        setTimeout(() => {
          if (document.body.contains(previewElement)) {
            document.body.removeChild(previewElement);
          }
        }, 100);
      } catch (err) {
        console.error('Error creating drag preview:', err);
        // Continue even if preview fails
      }
      
      // Add to recent nodes
      addToRecentNodes(nodeType);
    } catch (err) {
      console.error('Error in drag start:', err);
    }
  };

  // Toggle filter
  const toggleFilter = (category: string) => {
    setActiveFilters(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  // Render the node panel
  return (
    <div className="w-[280px] h-full border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
      {/* Search and filter section */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search nodes..."
            className="pl-8 pr-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            className={`absolute right-2 top-2 p-0.5 rounded transition-colors ${
              activeFilters.length > 0 ? 'text-primary' : 'text-slate-400'
            }`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            {activeFilters.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-3 h-3 text-[8px] flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>
        
        {/* Filter tags */}
        {showFilters && (
          <div className="overflow-hidden mt-2">
            <div className="flex flex-wrap gap-1">
              {Object.keys(nodesByCategory).map(category => (
                <Badge 
                  key={category}
                  variant={activeFilters.includes(category) ? "default" : "outline"}
                  className={`cursor-pointer transition-all hover:bg-primary/20 ${
                    activeFilters.includes(category) ? 'text-white' : 'text-primary'
                  }`}
                  onClick={() => toggleFilter(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs for node display */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start px-3 py-2 flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
          <TabsTrigger value="all" className="flex-1 gap-1">
            <Tag className="h-3 w-3" /> All
          </TabsTrigger>
          <TabsTrigger value="favorite" className="flex-1 gap-1">
            <Star className="h-3 w-3" /> Favorites
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex-1 gap-1">
            <Clock className="h-3 w-3" /> Recent
          </TabsTrigger>
        </TabsList>

        {/* All nodes tab */}
        <TabsContent value="all" className="flex-1 overflow-y-auto p-2">
          <Accordion
            type="multiple"
            defaultValue={[NodeCategory.TRIGGER, NodeCategory.AI]}
            className="space-y-2"
          >
            {Object.entries(nodesByCategory).map(([category, nodes]) => {
              const filteredNodes = filterNodes(nodes);
              if (filteredNodes.length === 0 && (searchQuery || activeFilters.length > 0)) return null;

              return (
                <AccordionItem 
                  key={category} 
                  value={category} 
                  className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-900"
                >
                  <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center gap-2">
                      {category}
                      <Badge variant="outline" className="font-normal text-xs px-1">
                        {filteredNodes.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-1 pt-0">
                    <div className="grid grid-cols-1 gap-1">
                      {filteredNodes.map((node) => (
                        <NodeItem
                          key={node.nodeType}
                          node={node}
                          onDragStart={onDragStart}
                          isFavorite={favorites.includes(node.nodeType)}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>

        {/* Favorites tab */}
        <TabsContent value="favorite" className="flex-1 overflow-y-auto p-2">
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {Object.values(nodeDefinitions)
                .filter(node => favorites.includes(node.type))
                .map(node => (
                  <NodeItem
                    key={node.type}
                    node={{ ...node, nodeType: node.type }}
                    onDragStart={onDragStart}
                    isFavorite={true}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-500 p-4">
                <Star className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                <p className="mb-2">No favorite nodes yet</p>
                <p className="text-xs">Star nodes to add them to your favorites</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Recent nodes tab */}
        <TabsContent value="recent" className="flex-1 overflow-y-auto p-2">
          {recentNodes.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {recentNodes
                .map(nodeType => ({ 
                  ...nodeDefinitions[nodeType], 
                  nodeType 
                }))
                .map(node => (
                  <NodeItem
                    key={node.nodeType}
                    node={node}
                    onDragStart={onDragStart}
                    isFavorite={favorites.includes(node.nodeType)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-500 p-4">
                <Clock className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                <p className="mb-2">No recent nodes</p>
                <p className="text-xs">Recently used nodes will appear here</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NodePanel;