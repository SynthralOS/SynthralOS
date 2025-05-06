import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { BackButton } from '@/components/BackButton';

interface Protocol {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
}

interface Parameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface Tool {
  name: string;
  description: string;
  parameters: Parameter[];
}

export default function SimpleProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch protocols
        const protocolsResponse = await fetch('/api/agent/protocols');
        const protocolsData = await protocolsResponse.json();
        console.log('Protocols data:', protocolsData);
        
        if (protocolsData && Array.isArray(protocolsData.protocols)) {
          setProtocols(protocolsData.protocols);
        } else {
          setProtocols([]);
        }
        
        // Fetch tools
        const toolsResponse = await fetch('/api/agent/tools');
        const toolsData = await toolsResponse.json();
        console.log('Tools data:', toolsData);
        
        if (toolsData && Array.isArray(toolsData.tools)) {
          setTools(toolsData.tools);
        } else {
          setTools([]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg border p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <BackButton />
          <h1 className="text-2xl font-bold ml-4">Simple Protocols Page</h1>
        </div>
        <div className="mb-6">
          <p className="text-gray-500">No AppLayout, no complex components, just raw data</p>
          <Link href="/ai/agent-protocols" className="text-blue-500 hover:underline mt-2 inline-block">
            Go to full Agent Protocols page
          </Link>
        </div>

        <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
          <p>Protocols count: {protocols.length}</p>
          <p>Tools count: {tools.length}</p>
          <p>Loading state: {isLoading ? 'Loading...' : 'Completed'}</p>
          <p>Error: {error?.message || 'None'}</p>
        </div>

        {isLoading ? (
          <div className="text-center p-8">
            <div className="inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2">Loading protocols...</p>
          </div>
        ) : protocols.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold mb-4">Available Protocols ({protocols.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {protocols.map((protocol, index) => (
                <div 
                  key={`${protocol.name}-${index}`}
                  className="bg-white border-2 border-green-500 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{protocol.name}</h3>
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      v{protocol.version}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{protocol.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {protocol.capabilities && protocol.capabilities.map((cap, i) => (
                      <span 
                        key={i} 
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Tools Section */}
            {tools.length > 0 && (
              <div className="mt-8 mb-6">
                <h2 className="text-xl font-bold mb-4">Available Tools ({tools.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {tools.map((tool, index) => (
                    <div 
                      key={`${tool.name}-${index}`}
                      className="bg-white border-2 border-blue-500 rounded-lg p-4 shadow-sm"
                    >
                      <h3 className="font-bold text-lg mb-2">{tool.name}</h3>
                      <p className="text-gray-700 mb-3">{tool.description}</p>
                      
                      {tool.parameters && tool.parameters.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-sm font-semibold mb-1">Parameters:</h4>
                          <div className="space-y-2">
                            {tool.parameters.map((param, i) => (
                              <div key={i} className="bg-gray-50 p-2 rounded text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{param.name}</span>
                                  <span className="text-xs bg-gray-200 px-1 rounded">{param.type}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{param.description}</p>
                                <div className="text-xs mt-1">
                                  {param.required ? (
                                    <span className="text-red-500">Required</span>
                                  ) : (
                                    <span className="text-gray-400">Optional</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h3 className="font-bold">First Protocol Raw Data:</h3>
              <pre className="text-xs bg-gray-50 p-2 mt-2 rounded overflow-auto max-h-48">
                {JSON.stringify(protocols[0], null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No protocols available</p>
          </div>
        )}
      </div>
    </div>
  );
}