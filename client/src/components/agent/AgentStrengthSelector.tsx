import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Strength = {
  key: string;
  value: string;
  humanReadable: string;
};

type Protocol = {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
};

type Classification = {
  protocol: string;
  name: string;
  primaryStrength: string;
  secondaryStrengths: string[];
  description: string;
  bestUseCases: string[];
  limitations: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  integrationLevel: 'standalone' | 'integrated' | 'orchestration';
};

type ProtocolRecommendation = {
  recommended: Classification[];
  reasoning: string;
};

interface AgentStrengthSelectorProps {
  onSelect?: (protocol: string) => void;
  showTaskInput?: boolean;
}

export default function AgentStrengthSelector({ 
  onSelect, 
  showTaskInput = true 
}: AgentStrengthSelectorProps) {
  const [selectedStrength, setSelectedStrength] = useState<string | null>(null);
  const [task, setTask] = useState('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendations, setRecommendations] = useState<ProtocolRecommendation | null>(null);
  const { toast } = useToast();

  // Fetch all strength categories
  const { 
    data: strengthsData,
    isLoading: isLoadingStrengths,
    error: strengthsError
  } = useQuery({
    queryKey: ['/api/agent/strengths'],
    retry: 1,
  });

  // Fetch all agent classifications
  const { 
    data: classificationsData,
    isLoading: isLoadingClassifications,
    error: classificationsError
  } = useQuery({
    queryKey: ['/api/agent/classifications'],
    retry: 1,
  });

  // Fetch protocols for a specific strength when selectedStrength changes
  const { 
    data: protocolsData,
    isLoading: isLoadingProtocols,
    error: protocolsError
  } = useQuery({
    queryKey: [`/api/agent/protocols/by-strength/${selectedStrength}`],
    retry: 1,
    enabled: !!selectedStrength,
  });

  // Get protocol by name
  const getProtocolClassification = (protocolName: string): Classification | undefined => {
    if (!classificationsData || !classificationsData.classifications) return undefined;
    return classificationsData.classifications.find(
      (c: Classification) => c.protocol === protocolName
    );
  };

  // Handle strength tab selection
  const handleStrengthSelect = (strength: string) => {
    setSelectedStrength(strength);
  };

  // Handle protocol selection
  const handleProtocolSelect = (protocolName: string) => {
    if (onSelect) {
      onSelect(protocolName);
    }
  };

  // Get recommendations based on task description
  const getRecommendations = async () => {
    if (!task.trim()) {
      toast({
        title: "Task required",
        description: "Please enter a task description to get recommendations",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRecommending(true);
      const response = await apiRequest(
        'POST', 
        '/api/agent/recommend', 
        { task }
      );
      const data = await response.json();
      setRecommendations(data);
      
      // If there are recommendations, select the first category
      if (data.recommended && data.recommended.length > 0) {
        const firstRec = data.recommended[0];
        setSelectedStrength(firstRec.primaryStrength);
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
      toast({
        title: "Recommendation Error",
        description: "Failed to get protocol recommendations",
        variant: "destructive"
      });
    } finally {
      setIsRecommending(false);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIntegrationColor = (level: string) => {
    switch (level) {
      case 'standalone': return 'bg-blue-100 text-blue-800';
      case 'integrated': return 'bg-purple-100 text-purple-800';
      case 'orchestration': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // If strengths or classifications are loading, show loading state
  if (isLoadingStrengths || isLoadingClassifications) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading agent classifications...</p>
      </div>
    );
  }

  // If there was an error, show error state
  if (strengthsError || classificationsError) {
    return (
      <div className="p-4 border border-red-300 rounded-md bg-red-50 text-red-800">
        <h3 className="text-lg font-medium">Error loading agent data</h3>
        <p className="text-sm">{String(strengthsError || classificationsError)}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {showTaskInput && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Task-based Agent Recommendation</CardTitle>
            <CardDescription>
              Describe your task and we'll recommend the best agent protocols for it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="task">Task Description</Label>
                <Textarea
                  id="task"
                  placeholder="Describe what you want the agent to do..."
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <Button 
                onClick={getRecommendations} 
                disabled={isRecommending || !task.trim()}
              >
                {isRecommending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Get Recommendations
              </Button>
            </div>
          </CardContent>
          {recommendations && (
            <CardFooter className="flex flex-col items-start border-t px-6 py-4 bg-muted/50">
              <h3 className="text-sm font-medium">Recommendation Reasoning:</h3>
              <p className="text-sm text-muted-foreground mt-1">{recommendations.reasoning}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {recommendations.recommended.map((rec, i) => (
                  <Badge 
                    key={i} 
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handleStrengthSelect(rec.primaryStrength)}
                  >
                    {rec.name}
                  </Badge>
                ))}
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      <Tabs defaultValue={selectedStrength || undefined} onValueChange={handleStrengthSelect}>
        <TabsList className="flex flex-wrap mb-4 h-auto">
          {strengthsData?.strengths?.map((strength: Strength) => (
            <TabsTrigger 
              key={strength.value} 
              value={strength.value}
              className="h-auto py-2 px-3 whitespace-normal text-left"
            >
              {strength.humanReadable}
            </TabsTrigger>
          ))}
        </TabsList>

        {strengthsData?.strengths?.map((strength: Strength) => (
          <TabsContent key={strength.value} value={strength.value}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Show loading state for protocols */}
              {isLoadingProtocols && selectedStrength === strength.value && (
                <div className="col-span-full flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-2">Loading protocols...</p>
                </div>
              )}

              {/* Show protocols for the selected strength */}
              {protocolsData?.protocols?.map((protocol: Protocol) => {
                const classification = getProtocolClassification(protocol.name);
                return (
                  <Card key={protocol.name} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{protocol.name}</CardTitle>
                        <div className="flex gap-1">
                          {classification && (
                            <>
                              <Badge className={getComplexityColor(classification.complexity)}>
                                {classification.complexity}
                              </Badge>
                              <Badge className={getIntegrationColor(classification.integrationLevel)}>
                                {classification.integrationLevel}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        {protocol.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {classification && (
                        <div className="space-y-2">
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground">BEST USE CASES</h4>
                            <ul className="text-sm pl-5 list-disc mt-1">
                              {classification.bestUseCases.slice(0, 3).map((useCase, i) => (
                                <li key={i}>{useCase}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground">LIMITATIONS</h4>
                            <ul className="text-sm pl-5 list-disc mt-1">
                              {classification.limitations.slice(0, 2).map((limitation, i) => (
                                <li key={i}>{limitation}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button 
                        variant="secondary" 
                        className="w-full"
                        onClick={() => handleProtocolSelect(protocol.name)}
                      >
                        <Check className="mr-2 h-4 w-4" /> 
                        Select this protocol
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}

              {/* Show error state for protocols */}
              {protocolsError && selectedStrength === strength.value && (
                <div className="col-span-full p-4 border border-red-300 rounded-md bg-red-50 text-red-800">
                  <h3 className="text-lg font-medium">Error loading protocols</h3>
                  <p className="text-sm">{String(protocolsError)}</p>
                </div>
              )}

              {/* Show empty state for protocols */}
              {protocolsData?.protocols?.length === 0 && selectedStrength === strength.value && (
                <div className="col-span-full p-4 border border-gray-300 rounded-md bg-gray-50 text-gray-800">
                  <h3 className="text-lg font-medium">No protocols found</h3>
                  <p className="text-sm">No agent protocols match this strength category.</p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}