import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppLayout } from '@/layouts/AppLayout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';

const languageOptions = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  ruby: 'Ruby',
  php: 'PHP',
  shell: 'Shell',
  r: 'R',
  julia: 'Julia',
  'c': 'C',
  'cpp': 'C++',
  html: 'HTML',
  css: 'CSS'
};

const defaultCodeSnippets = {
  javascript: `// JavaScript example
console.log("Hello, world!");

// Calculate the sum of an array
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log(\`Sum: \${sum}\`);

// Create a simple function
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

console.log(\`Factorial of 5: \${factorial(5)}\`);`,
  typescript: `// TypeScript example
console.log("Hello, world!");

// Define interfaces
interface Person {
    name: string;
    age: number;
}

// Create an object with the interface
const person: Person = {
    name: "John Doe",
    age: 30
};

// Calculate the sum of an array with explicit types
const numbers: number[] = [1, 2, 3, 4, 5];
const sum: number = numbers.reduce((a, b) => a + b, 0);

console.log(\`Person: \${person.name}, \${person.age}\`);
console.log(\`Sum: \${sum}\`);`,
  python: `# Python example
print("Hello, world!")

# Calculate the sum of a list
numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
print(f"Sum: {total}")

# Define a simple function
def factorial(n):
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)

print(f"Factorial of 5: {factorial(5)}")

# List comprehension example
squares = [x**2 for x in range(1, 6)]
print(f"Squares: {squares}")`,
  rust: `// Rust example
fn main() {
    println!("Hello, world!");
    
    // Calculate sum of a vector
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Sum: {}", sum);
    
    // Define a function
    fn factorial(n: u64) -> u64 {
        if n <= 1 {
            1
        } else {
            n * factorial(n - 1)
        }
    }
    
    println!("Factorial of 5: {}", factorial(5));
}`,
  go: `// Go example
package main

import (
        "fmt"
)

func main() {
        fmt.Println("Hello, world!")
        
        // Calculate sum of a slice
        numbers := []int{1, 2, 3, 4, 5}
        sum := 0
        for _, num := range numbers {
                sum += num
        }
        fmt.Printf("Sum: %d\\n", sum)
        
        // Call a function
        fmt.Printf("Factorial of 5: %d\\n", factorial(5))
}

func factorial(n int) int {
        if n <= 1 {
                return 1
        }
        return n * factorial(n-1)
}`,
  java: `// Java example
public class Example {
    public static void main(String[] args) {
        System.out.println("Hello, world!");
        
        // Calculate sum of an array
        int[] numbers = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int num : numbers) {
            sum += num;
        }
        System.out.println("Sum: " + sum);
        
        // Call a method
        System.out.println("Factorial of 5: " + factorial(5));
    }
    
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
}`,
  ruby: `# Ruby example
puts "Hello, world!"

# Calculate sum of an array
numbers = [1, 2, 3, 4, 5]
sum = numbers.reduce(0) { |a, b| a + b }
puts "Sum: #{sum}"

# Define a method
def factorial(n)
  return 1 if n <= 1
  n * factorial(n - 1)
end

puts "Factorial of 5: #{factorial(5)}"

# Map example
squares = numbers.map { |n| n * n }
puts "Squares: #{squares}"`,
  php: `<?php
// PHP example
echo "Hello, world!\n";

// Calculate sum of an array
$numbers = [1, 2, 3, 4, 5];
$sum = array_sum($numbers);
echo "Sum: $sum\n";

// Define a function
function factorial($n) {
    if ($n <= 1) return 1;
    return $n * factorial($n - 1);
}

echo "Factorial of 5: " . factorial(5) . "\n";
?>`,
  shell: `# Shell script example
echo "Hello, world!"

# Simple commands
echo "Current directory:"
pwd

# Show date and time
echo "Current date and time:"
date

# Simple math with bc
echo "2 + 2 = $(echo '2+2' | bc)"

# List files
echo "Files in current directory:"
ls -la`,
  r: `# R example
print("Hello, world!")

# Calculate sum of a vector
numbers <- c(1, 2, 3, 4, 5)
sum_val <- sum(numbers)
print(paste("Sum:", sum_val))

# Define a function
factorial <- function(n) {
  if (n <= 1) return(1)
  return(n * factorial(n - 1))
}

print(paste("Factorial of 5:", factorial(5)))

# Apply function to vector
squares <- sapply(numbers, function(x) x^2)
print(paste("Squares:", paste(squares, collapse=", ")))`,
  julia: `# Julia example
println("Hello, world!")

# Calculate sum of an array
numbers = [1, 2, 3, 4, 5]
sum_val = sum(numbers)
println("Sum: $sum_val")

# Define a function
function factorial(n)
    if n <= 1
        return 1
    else
        return n * factorial(n - 1)
    end
end

println("Factorial of 5: $(factorial(5))")

# Comprehension example
squares = [x^2 for x in numbers]
println("Squares: $squares")`,
  c: `// C example
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    printf("Hello, world!\\n");
    
    // Calculate sum of an array
    int numbers[] = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += numbers[i];
    }
    printf("Sum: %d\\n", sum);
    
    // Call a function
    printf("Factorial of 5: %d\\n", factorial(5));
    
    return 0;
}`,
  cpp: `// C++ example
#include <iostream>
#include <vector>
#include <numeric>
using namespace std;

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    cout << "Hello, world!" << endl;
    
    // Calculate sum of a vector
    vector<int> numbers = {1, 2, 3, 4, 5};
    int sum = std::accumulate(numbers.begin(), numbers.end(), 0);
    cout << "Sum: " << sum << endl;
    
    // Call a function
    cout << "Factorial of 5: " << factorial(5) << endl;
    
    return 0;
}`,
  html: `<!-- HTML example -->
<!DOCTYPE html>
<html>
<head>
    <title>Hello World</title>
</head>
<body>
    <h1>Hello, world!</h1>
    <p>This is a simple HTML example.</p>
</body>
</html>`,
  css: `/* CSS example */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f0f0f0;
}

h1 {
    color: #333;
    text-align: center;
}

p {
    line-height: 1.6;
}`
};

interface Runtime {
  name: string;
  capabilities: {
    supportedLanguages: string[];
    persistence: boolean;
    sandboxed: boolean;
    maxExecutionTime: number;
    maxMemory: number;
    supportsPackages: boolean;
    supportedPackageManagers?: string[];
    supportsStreaming: boolean;
    supportsFileIO: boolean;
    supportsNetworkAccess: boolean;
    supportsConcurrency: boolean;
    maxConcurrentExecutions?: number;
  };
  available: boolean;
}

interface RuntimesResponse {
  runtimes: Runtime[];
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsage?: number;
}

export default function RuntimeDashboard() {
  const [selectedRuntime, setSelectedRuntime] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<string>(defaultCodeSnippets.javascript);
  const { toast } = useToast();

  // Fetch list of available runtimes
  const { data: runtimesData, isLoading: isLoadingRuntimes } = useQuery<RuntimesResponse>({
    queryKey: ['/api/runtime/runtimes']
  });

  // Set selected runtime when data loads
  useEffect(() => {
    if (runtimesData?.runtimes && runtimesData.runtimes.length > 0 && !selectedRuntime) {
      setSelectedRuntime(runtimesData.runtimes[0].name);
    }
  }, [runtimesData, selectedRuntime]);

  // Mutation for executing code
  const { mutate: executeCode, isPending: isExecuting, data: executionResult } = useMutation<ExecutionResult>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/runtime/execute', {
        runtime: selectedRuntime,
        code,
        language: selectedLanguage,
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          title: 'Execution Failed',
          description: data.error || 'Unknown error occurred',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Execution Completed',
          description: `Code executed in ${data.executionTime}ms`,
        });
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to execute code',
        variant: 'destructive',
      });
    }
  });

  // Get current runtime details
  const currentRuntime = runtimesData?.runtimes.find(r => r.name === selectedRuntime);
  
  // Handle language change
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setCode(defaultCodeSnippets[lang as keyof typeof defaultCodeSnippets] || '');
  };

  return (
    <AppLayout title="Runtime Dashboard" requireAuth={false}>
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Runtime Dashboard</h1>
          <p className="text-slate-500 mt-2">
            Execute code across different runtime environments and explore their capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Runtime Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Available Runtimes</CardTitle>
                <CardDescription>
                  Select a runtime environment to execute your code
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRuntimes ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <>
                    <Select 
                      value={selectedRuntime} 
                      onValueChange={setSelectedRuntime}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a runtime" />
                      </SelectTrigger>
                      <SelectContent>
                        {runtimesData?.runtimes?.map((runtime) => (
                          <SelectItem key={runtime.name} value={runtime.name}>
                            {runtime.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {currentRuntime && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Capabilities</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <Badge variant={currentRuntime.capabilities.sandboxed ? "default" : "outline"}>
                              {currentRuntime.capabilities.sandboxed ? "Sandboxed" : "Not Sandboxed"}
                            </Badge>
                            <Badge variant={currentRuntime.capabilities.persistence ? "default" : "outline"}>
                              {currentRuntime.capabilities.persistence ? "Persistent" : "Stateless"}
                            </Badge>
                            <Badge variant={currentRuntime.capabilities.supportsPackages ? "default" : "outline"}>
                              {currentRuntime.capabilities.supportsPackages ? "Packages Support" : "No Packages"}
                            </Badge>
                            <Badge variant={currentRuntime.capabilities.supportsFileIO ? "default" : "outline"}>
                              {currentRuntime.capabilities.supportsFileIO ? "File I/O" : "No File I/O"}
                            </Badge>
                            <Badge variant={currentRuntime.capabilities.supportsNetworkAccess ? "default" : "outline"}>
                              {currentRuntime.capabilities.supportsNetworkAccess ? "Network Access" : "No Network"}
                            </Badge>
                            <Badge variant={currentRuntime.capabilities.supportsStreaming ? "default" : "outline"}>
                              {currentRuntime.capabilities.supportsStreaming ? "Streaming" : "No Streaming"}
                            </Badge>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Languages</h4>
                          <div className="flex flex-wrap gap-2">
                            {currentRuntime.capabilities.supportedLanguages.map((lang) => (
                              <Badge 
                                key={lang} 
                                variant={selectedLanguage === lang ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => handleLanguageChange(lang)}
                              >
                                {languageOptions[lang as keyof typeof languageOptions] || lang}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-1">Limits</h4>
                          <div className="text-sm">
                            <div className="flex justify-between mb-1">
                              <span className="text-slate-500">Max Execution Time:</span>
                              <span>{currentRuntime.capabilities.maxExecutionTime}ms</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Max Memory:</span>
                              <span>{currentRuntime.capabilities.maxMemory}MB</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Code Editor */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Code Editor</CardTitle>
                <CardDescription>
                  Write or paste your code to execute in the selected runtime
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono h-80 resize-none"
                  placeholder="Enter your code here..."
                />
              </CardContent>
              <CardFooter className="justify-between">
                <div className="flex gap-2">
                  <Select 
                    value={selectedLanguage} 
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(languageOptions).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => executeCode()} 
                  disabled={isExecuting || !selectedRuntime || !code}
                >
                  {isExecuting ? 'Executing...' : 'Execute Code'}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Execution Results */}
            <Card>
              <CardHeader>
                <CardTitle>Execution Results</CardTitle>
                <CardDescription>
                  Output and metrics from code execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isExecuting ? (
                  <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900 h-60 flex items-center justify-center">
                    <div className="animate-pulse text-center">
                      <div className="h-8 w-8 mx-auto mb-4 rounded-full border-4 border-t-transparent border-primary-500 animate-spin"></div>
                      <p className="text-slate-500">Executing code...</p>
                    </div>
                  </div>
                ) : executionResult ? (
                  <Tabs defaultValue="output">
                    <TabsList>
                      <TabsTrigger value="output">Output</TabsTrigger>
                      <TabsTrigger value="metrics">Metrics</TabsTrigger>
                      {executionResult.error && (
                        <TabsTrigger value="error">Error</TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="output">
                      <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900 min-h-[240px] font-mono whitespace-pre-wrap overflow-auto">
                        {executionResult.output || 'No output'}
                      </div>
                    </TabsContent>
                    <TabsContent value="metrics">
                      <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900 min-h-[240px]">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 border rounded-md bg-white dark:bg-slate-800">
                            <h3 className="text-sm font-medium text-slate-500 mb-1">Execution Time</h3>
                            <p className="text-2xl font-bold">{executionResult.executionTime}ms</p>
                          </div>
                          {executionResult.memoryUsage && (
                            <div className="p-4 border rounded-md bg-white dark:bg-slate-800">
                              <h3 className="text-sm font-medium text-slate-500 mb-1">Memory Usage</h3>
                              <p className="text-2xl font-bold">{executionResult.memoryUsage}MB</p>
                            </div>
                          )}
                          <div className="p-4 border rounded-md bg-white dark:bg-slate-800">
                            <h3 className="text-sm font-medium text-slate-500 mb-1">Status</h3>
                            <div className="flex items-center">
                              <div className={`h-3 w-3 rounded-full mr-2 ${executionResult.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <p className="font-bold">{executionResult.success ? 'Success' : 'Failed'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    {executionResult.error && (
                      <TabsContent value="error">
                        <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900 min-h-[240px] font-mono text-red-500 whitespace-pre-wrap overflow-auto">
                          {executionResult.error}
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                ) : (
                  <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900 h-60 flex items-center justify-center">
                    <p className="text-slate-500">Execute code to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}