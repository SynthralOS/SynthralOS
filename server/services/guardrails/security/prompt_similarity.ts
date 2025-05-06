/**
 * Prompt Similarity Detection
 * 
 * This module detects similar prompts to prevent abuse and excessive API usage.
 */

// Since we're having issues with the cosine-similarity package type definitions,
// let's create a simple implementation without external dependencies
// This avoids the need for the cosine-similarity package

export interface SimilarityConfig {
  threshold: number;
  minTokensForDetection: number;
  maxHistorySize: number;
}

export interface SimilarityResult {
  isSimilar: boolean;
  similarityScore: number;
  matchedPrompt?: string;
}

/**
 * Simple text vectorization for similarity comparison
 * 
 * @param text Text to vectorize
 * @returns A vector representation (term frequency)
 */
function vectorizeText(text: string): Record<string, number> {
  // Normalize text: lowercase and remove punctuation
  const normalizedText = text.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
  
  // Tokenize into words
  const tokens = normalizedText.split(/\s+/);
  
  // Create term frequency vector
  const vector: Record<string, number> = {};
  
  tokens.forEach(token => {
    if (token.length > 0) {
      vector[token] = (vector[token] || 0) + 1;
    }
  });
  
  return vector;
}

/**
 * Prepare vectors for similarity calculation by aligning them
 * 
 * @param vector1 First term frequency vector
 * @param vector2 Second term frequency vector
 * @returns Arrays of aligned vector values
 */
function prepareVectorsForSimilarityCalculation(
  vector1: Record<string, number>,
  vector2: Record<string, number>
): [number[], number[]] {
  // Get all unique terms
  const allTerms = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
  
  // Create aligned vectors
  const alignedVector1: number[] = [];
  const alignedVector2: number[] = [];
  
  allTerms.forEach(term => {
    alignedVector1.push(vector1[term] || 0);
    alignedVector2.push(vector2[term] || 0);
  });
  
  return [alignedVector1, alignedVector2];
}

/**
 * Calculate cosine similarity between two vectors
 * 
 * @param a First vector
 * @param b Second vector
 * @returns Similarity score between 0 and 1
 */
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  
  if (a.length === 0) {
    return 0;
  }
  
  // Calculate dot product
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  // Avoid division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate cosine similarity between two texts
 * 
 * @param text1 First text
 * @param text2 Second text
 * @returns Similarity score between 0 and 1
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  // Get term frequency vectors
  const vector1 = vectorizeText(text1);
  const vector2 = vectorizeText(text2);
  
  // Align vectors for similarity calculation
  const [alignedVector1, alignedVector2] = prepareVectorsForSimilarityCalculation(vector1, vector2);
  
  // Calculate cosine similarity
  return calculateCosineSimilarity(alignedVector1, alignedVector2);
}

/**
 * Prompt Similarity Detector
 * 
 * Detects similar prompts to prevent abuse and excessive API usage
 */
export class PromptSimilarityDetector {
  private config: SimilarityConfig;
  private history: string[] = [];
  
  constructor(config: SimilarityConfig) {
    this.config = config;
  }
  
  /**
   * Check if a prompt is similar to any in history
   * 
   * @param prompt Prompt to check
   * @returns Result with similarity information
   */
  checkSimilarity(prompt: string): SimilarityResult {
    const result: SimilarityResult = {
      isSimilar: false,
      similarityScore: 0
    };
    
    // If prompt is too short, don't check similarity
    if (prompt.length < this.config.minTokensForDetection) {
      return result;
    }
    
    // If no history, return not similar
    if (this.history.length === 0) {
      return result;
    }
    
    // Find most similar prompt in history
    let highestSimilarity = 0;
    let mostSimilarPrompt = '';
    
    for (const historyPrompt of this.history) {
      const similarity = calculateTextSimilarity(prompt, historyPrompt);
      
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        mostSimilarPrompt = historyPrompt;
      }
    }
    
    result.similarityScore = highestSimilarity;
    
    // Check if similarity exceeds threshold
    if (highestSimilarity >= this.config.threshold) {
      result.isSimilar = true;
      result.matchedPrompt = mostSimilarPrompt;
    }
    
    return result;
  }
  
  /**
   * Add a prompt to the history
   * 
   * @param prompt Prompt to add
   */
  addToHistory(prompt: string): void {
    this.history.push(prompt);
    
    // Maintain max history size
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Clear the history
   */
  clearHistory(): void {
    this.history = [];
  }
  
  /**
   * Update the configuration
   * 
   * @param config New configuration
   */
  updateConfig(config: Partial<SimilarityConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
}