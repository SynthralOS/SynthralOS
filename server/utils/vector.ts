/**
 * Vector operations utilities for RAG and embedding operations 
 */
import { createHash } from 'crypto';
import OpenAI from 'openai';

// OpenAI Configuration - use if API key is available
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Simple deterministic vector embedding for text
 * This is a fallback when no embedding API is available
 */
export function generateDeterministicEmbedding(text: string, dimensions: number = 1536): number[] {
  // Use a hash function to get reproducible values
  const hash = createHash('sha256').update(text).digest('hex');
  
  // Generate vector of specified dimensions
  const embedding: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    // Use characters from the hash to seed the embedding values
    const hashPart = parseInt(hash.substring((i * 2) % 64, (i * 2 + 2) % 64), 16);
    // Normalize to range [-1, 1]
    embedding.push((hashPart / 65535) * 2 - 1);
  }
  
  // Normalize the vector to unit length
  return normalizeVector(embedding);
}

/**
 * Generate embedding using OpenAI's API
 */
export async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    console.warn('OpenAI API key not set, using deterministic embedding');
    return generateDeterministicEmbedding(text);
  }
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text.trim(),
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating OpenAI embedding:', error);
    console.warn('Falling back to deterministic embedding');
    return generateDeterministicEmbedding(text);
  }
}

/**
 * Get embedding with auto-fallback
 */
export async function getEmbedding(text: string, dimensions: number = 1536): Promise<number[]> {
  if (openai) {
    try {
      return await generateOpenAIEmbedding(text);
    } catch (error) {
      console.warn('Error using OpenAI for embedding, falling back to deterministic method');
      return generateDeterministicEmbedding(text, dimensions);
    }
  }
  return generateDeterministicEmbedding(text, dimensions);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  
  // Avoid division by zero
  if (magnitude === 0) {
    return vector.map(() => 0);
  }
  
  return vector.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  // Avoid division by zero
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Calculate Manhattan distance between two vectors
 */
export function manhattanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  
  return sum;
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }
  
  let product = 0;
  for (let i = 0; i < a.length; i++) {
    product += a[i] * b[i];
  }
  
  return product;
}

/**
 * Add two vectors
 */
export function addVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }
  
  return a.map((val, i) => val + b[i]);
}

/**
 * Subtract vector b from vector a
 */
export function subtractVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
  }
  
  return a.map((val, i) => val - b[i]);
}

/**
 * Scale a vector by a scalar
 */
export function scaleVector(vector: number[], scalar: number): number[] {
  return vector.map(val => val * scalar);
}

/**
 * Calculate the magnitude (Euclidean norm) of a vector
 */
export function vectorMagnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Calculate the average of multiple vectors
 */
export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot average an empty array of vectors');
  }
  
  const dimensions = vectors[0].length;
  for (const vector of vectors) {
    if (vector.length !== dimensions) {
      throw new Error('All vectors must have the same dimensions');
    }
  }
  
  const result: number[] = new Array(dimensions).fill(0);
  
  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i++) {
      result[i] += vector[i];
    }
  }
  
  return result.map(val => val / vectors.length);
}

/**
 * Find the nearest vector by cosine similarity
 */
export function findNearest(query: number[], vectors: number[][], k: number = 1): { index: number; similarity: number }[] {
  if (vectors.length === 0) {
    return [];
  }
  
  const similarities = vectors.map((vector, index) => ({
    index,
    similarity: cosineSimilarity(query, vector)
  }));
  
  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // Return top k
  return similarities.slice(0, k);
}

/**
 * Break up text into manageable chunks for embedding
 */
export function chunkText(text: string, maxChunkSize: number = 1000, overlapSize: number = 100): string[] {
  if (!text) return [];
  
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    // Find a good breaking point near maxChunkSize
    let endIndex = Math.min(startIndex + maxChunkSize, text.length);
    
    // If we're not at the end, try to break at a sentence or paragraph
    if (endIndex < text.length) {
      // Look for paragraph break
      const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
      if (paragraphBreak > startIndex && paragraphBreak > endIndex - 200) {
        endIndex = paragraphBreak + 2;
      } else {
        // Look for line break
        const lineBreak = text.lastIndexOf('\n', endIndex);
        if (lineBreak > startIndex && lineBreak > endIndex - 100) {
          endIndex = lineBreak + 1;
        } else {
          // Look for sentence end
          const sentenceEnd = Math.max(
            text.lastIndexOf('. ', endIndex),
            text.lastIndexOf('! ', endIndex),
            text.lastIndexOf('? ', endIndex),
            text.lastIndexOf('.\n', endIndex),
            text.lastIndexOf('!\n', endIndex),
            text.lastIndexOf('?\n', endIndex)
          );
          
          if (sentenceEnd > startIndex && sentenceEnd > endIndex - 50) {
            endIndex = sentenceEnd + 2;
          } else {
            // Look for word boundary
            const wordBreak = text.lastIndexOf(' ', endIndex);
            if (wordBreak > startIndex) {
              endIndex = wordBreak + 1;
            }
          }
        }
      }
    }
    
    // Add the chunk
    chunks.push(text.substring(startIndex, endIndex).trim());
    
    // Move start index for next chunk, with overlap
    startIndex = Math.max(startIndex, endIndex - overlapSize);
  }
  
  return chunks;
}

export default {
  generateDeterministicEmbedding,
  generateOpenAIEmbedding,
  getEmbedding,
  normalizeVector,
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  dotProduct,
  addVectors,
  subtractVectors,
  scaleVector,
  vectorMagnitude,
  averageVectors,
  findNearest,
  chunkText
};