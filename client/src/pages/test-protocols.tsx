import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/BackButton';

interface Protocol {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
}

export default function TestProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProtocols = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/agent/protocols');
        const data = await response.json();
        console.log('Direct fetch data:', data);
        
        if (data && Array.isArray(data.protocols)) {
          setProtocols(data.protocols);
        } else {
          setProtocols([]);
        }
      } catch (err) {
        console.error('Error fetching protocols:', err);
        setError('Failed to fetch protocols');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProtocols();
  }, []);

  // Create static test protocols for verification
  const testProtocols: Protocol[] = [
    {
      name: "test-protocol-1",
      version: "1.0.0",
      description: "Test protocol for debugging",
      capabilities: ["test", "debug"]
    },
    {
      name: "test-protocol-2",
      version: "1.0.0",
      description: "Another test protocol",
      capabilities: ["test", "example"]
    }
  ];

  return (
    <div className="p-4 md:p-8 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <BackButton />
        <h1 className="text-2xl font-bold">Test Protocols Page</h1>
      </div>
      <p className="text-gray-500 mb-6">Debug page for rendering protocols</p>

      <div className="bg-red-100 border-2 border-red-500 p-4 rounded-md mb-6">
        <h3 className="text-lg font-bold mb-2">Debug Information</h3>
        <p>Protocols from API: {protocols.length}</p>
        <p>Loading state: {isLoading ? 'Loading...' : 'Completed'}</p>
        <p>Error: {error || 'None'}</p>
      </div>

      <h2 className="text-xl font-bold mb-4">Static Test Protocols</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {testProtocols.map((protocol, index) => (
          <div key={`static-${index}`} className="border-2 border-blue-500 rounded-lg p-4">
            <h3 className="font-bold">{protocol.name} - v{protocol.version}</h3>
            <p className="mt-2">{protocol.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {protocol.capabilities.map((cap, i) => (
                <span key={i} className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded">{cap}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">API Fetched Protocols</h2>
      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : protocols.length > 0 ? (
        <div className="space-y-4 mt-4">
          {/* If there are any issues with mapping over protocols, let's manually output the first one */}
          <Card className="border-2 border-orange-500 mb-4">
            <CardHeader>
              <CardTitle>First Protocol (Manual)</CardTitle>
            </CardHeader>
            <CardContent>
              {protocols.length > 0 ? (
                <div>
                  <p><strong>Name:</strong> {protocols[0].name}</p>
                  <p><strong>Version:</strong> {protocols[0].version}</p>
                  <p><strong>Description:</strong> {protocols[0].description}</p>
                  <p><strong>Raw data:</strong> {JSON.stringify(protocols[0])}</p>
                </div>
              ) : (
                <p>No protocols available</p>
              )}
            </CardContent>
          </Card>
          
          {/* Let's try to map only the first 3 protocols with minimal properties */}
          {protocols.slice(0, 3).map((protocol, index) => (
            <Card key={`api-${index}`} className="border-2 border-green-500 mb-4">
              <CardHeader>
                <CardTitle>{protocol?.name || 'Unknown'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">{protocol?.description || 'No description'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-gray-100 rounded-md">
          <p>No protocols fetched from API</p>
        </div>
      )}
    </div>
  );
}