import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/**
 * Custom hook for LangChain operations
 * 
 * Provides convenient functions for working with LangChain within the workflow builder.
 */
export function useLangChainOperations() {
  const queryClient = useQueryClient();

  // Get LangChain service status
  const { data: serviceStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['/api/langchain/status'],
    staleTime: 30000, // Cache for 30 seconds
  });

  // Get available tools
  const { data: availableTools, isLoading: isLoadingTools } = useQuery({
    queryKey: ['/api/langchain/tools'],
    staleTime: 60000, // Cache for 1 minute
  });

  // Execute LLM chain
  const executeLLMChainMutation = useMutation({
    mutationFn: async (params: {
      promptTemplate: string;
      input: string;
      options?: Record<string, any>;
    }) => {
      const response = await apiRequest('POST', '/api/langchain/chain', params);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries if needed
    },
  });

  // Execute retrieval chain
  const executeRetrievalChainMutation = useMutation({
    mutationFn: async (params: {
      collectionId: number;
      promptTemplate: string;
      query: string;
      options?: Record<string, any>;
    }) => {
      const response = await apiRequest('POST', '/api/langchain/retrieval', params);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries if needed
    },
  });

  // Execute agent
  const executeAgentMutation = useMutation({
    mutationFn: async (params: {
      systemMessage: string;
      tools: string[];
      query: string;
      options?: Record<string, any>;
    }) => {
      const response = await apiRequest('POST', '/api/langchain/agent', params);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries if needed
    },
  });

  return {
    // Service status
    serviceStatus,
    isLoadingStatus,
    
    // Tools
    availableTools,
    isLoadingTools,
    
    // Mutations
    executeLLMChain: executeLLMChainMutation.mutateAsync,
    isExecutingLLMChain: executeLLMChainMutation.isPending,
    llmChainError: executeLLMChainMutation.error,
    
    executeRetrievalChain: executeRetrievalChainMutation.mutateAsync,
    isExecutingRetrievalChain: executeRetrievalChainMutation.isPending,
    retrievalChainError: executeRetrievalChainMutation.error,
    
    executeAgent: executeAgentMutation.mutateAsync,
    isExecutingAgent: executeAgentMutation.isPending,
    agentError: executeAgentMutation.error,
  };
}