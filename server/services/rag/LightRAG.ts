import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getEmbedding, cosineSimilarity, findNearest } from '../../utils/vector';

/**
 * RetrievedChunk represents a document chunk retrieved from the vector store
 */
interface RetrievedChunk {
  content: string;
  metadata: Record<string, any>;
  score: number;
}

/**
 * DocumentChunk represents a chunk of a document
 */
interface DocumentChunk {
  id: string;
  docId: string;
  content: string;
  metadata: Record<string, any>;
  embedding: number[];
}

/**
 * LightRAG Configuration options
 */
interface LightRAGConfig {
  dataDir?: string;
  embeddingDimensions?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  similarityThreshold?: number;
}

/**
 * LightRAG is a lightweight retrieval-augmented generation system
 * It uses cosine similarity for retrieval without requiring a specialized vector database
 */
export class LightRAG {
  private chunks: Map<string, DocumentChunk> = new Map();
  private config: LightRAGConfig;
  private dataDir: string;
  
  constructor(config: LightRAGConfig = {}) {
    this.config = {
      dataDir: config.dataDir || './data/rag',
      embeddingDimensions: config.embeddingDimensions || 1536,
      chunkSize: config.chunkSize || 512,
      chunkOverlap: config.chunkOverlap || 50,
      similarityThreshold: config.similarityThreshold || 0.7
    };
    
    this.dataDir = this.config.dataDir as string;
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    this.loadChunks();
  }
  
  /**
   * Load chunks from disk
   */
  private loadChunks(): void {
    try {
      const chunksFile = path.join(this.dataDir, 'chunks.json');
      
      if (fs.existsSync(chunksFile)) {
        const data = JSON.parse(fs.readFileSync(chunksFile, 'utf-8'));
        
        for (const chunk of data) {
          this.chunks.set(chunk.id, chunk);
        }
        
        console.log(`Loaded ${this.chunks.size} chunks from ${chunksFile}`);
      }
    } catch (error) {
      console.error('Error loading chunks:', error);
    }
  }
  
  /**
   * Save chunks to disk
   */
  private saveChunks(): void {
    try {
      const chunksFile = path.join(this.dataDir, 'chunks.json');
      const data = Array.from(this.chunks.values());
      
      fs.writeFileSync(chunksFile, JSON.stringify(data, null, 2));
      
      console.log(`Saved ${data.length} chunks to ${chunksFile}`);
    } catch (error) {
      console.error('Error saving chunks:', error);
    }
  }
  
  /**
   * Split text into chunks
   * 
   * @param text Text to split
   * @returns Array of text chunks
   */
  private splitIntoChunks(text: string): string[] {
    const chunkSize = this.config.chunkSize as number;
    const overlap = this.config.chunkOverlap as number;
    const chunks: string[] = [];
    
    // Simple chunking by characters with overlap
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
      
      // If we've reached the end of the text, stop
      if (i + chunkSize >= text.length) {
        break;
      }
    }
    
    return chunks;
  }
  
  /**
   * Add a document to the LightRAG system
   * 
   * @param content Document content
   * @param metadata Document metadata
   * @returns True if the document was added successfully
   */
  async addDocument(content: string, metadata: Record<string, any> = {}): Promise<boolean> {
    try {
      if (!content) {
        throw new Error('Document content is required');
      }
      
      // Generate a unique document ID
      const docId = metadata.id || uuidv4();
      
      // Split the document into chunks
      const textChunks = this.splitIntoChunks(content);
      
      // Process each chunk
      for (let i = 0; i < textChunks.length; i++) {
        // Generate a unique ID for this chunk
        const chunkId = `${docId}-${i}`;
        
        // Generate an embedding for the chunk
        const embedding = await getEmbedding(textChunks[i]);
        
        // Create a chunk object
        const chunk: DocumentChunk = {
          id: chunkId,
          docId,
          content: textChunks[i],
          metadata: {
            ...metadata,
            chunkIndex: i,
            chunkCount: textChunks.length
          },
          embedding
        };
        
        // Store the chunk
        this.chunks.set(chunkId, chunk);
      }
      
      // Save chunks to disk
      this.saveChunks();
      
      return true;
    } catch (error) {
      console.error('Error adding document:', error);
      return false;
    }
  }
  
  /**
   * Delete a document from the LightRAG system
   * 
   * @param docId Document ID
   * @returns True if the document was deleted successfully
   */
  deleteDocument(docId: string): boolean {
    try {
      let deleted = false;
      
      // Iterate through all chunks and delete those matching the document ID
      for (const [chunkId, chunk] of this.chunks.entries()) {
        if (chunk.docId === docId) {
          this.chunks.delete(chunkId);
          deleted = true;
        }
      }
      
      if (deleted) {
        // Save updated chunks to disk
        this.saveChunks();
      }
      
      return deleted;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }
  
  /**
   * Query the LightRAG system
   * 
   * @param text Query text
   * @param limit Maximum number of chunks to return
   * @returns Array of retrieved chunks
   */
  async query(text: string, limit: number = 5): Promise<RetrievedChunk[]> {
    try {
      if (!text) {
        throw new Error('Query text is required');
      }
      
      // Generate an embedding for the query
      const queryEmbedding = await getEmbedding(text);
      
      // Get all embeddings from the chunks
      const embeddings: number[][] = [];
      const chunkArray: DocumentChunk[] = [];
      
      for (const chunk of this.chunks.values()) {
        embeddings.push(chunk.embedding);
        chunkArray.push(chunk);
      }
      
      // Find the top K most similar vectors
      const topResults = findNearest(
        queryEmbedding,
        embeddings,
        limit
      ).filter(result => result.similarity >= (this.config.similarityThreshold as number));
      
      // Map results to retrieved chunks
      const retrievedChunks: RetrievedChunk[] = topResults.map(result => {
        const chunk = chunkArray[result.index];
        
        return {
          content: chunk.content,
          metadata: chunk.metadata,
          score: result.similarity
        };
      });
      
      return retrievedChunks;
    } catch (error) {
      console.error('Error querying LightRAG:', error);
      return [];
    }
  }
  
  /**
   * Get stats about the LightRAG system
   */
  async getStats(): Promise<Record<string, any>> {
    const documents = new Set<string>();
    
    for (const chunk of this.chunks.values()) {
      documents.add(chunk.docId);
    }
    
    return {
      chunkCount: this.chunks.size,
      documentCount: documents.size,
      avgChunksPerDocument: documents.size === 0 
        ? 0 
        : this.chunks.size / documents.size,
      configSettings: {
        ...this.config
      }
    };
  }
  
  /**
   * List all documents
   */
  listDocuments(): { docId: string; metadata: Record<string, any>; chunkCount: number }[] {
    const documents = new Map<string, { 
      docId: string;
      metadata: Record<string, any>;
      chunkCount: number; 
    }>();
    
    for (const chunk of this.chunks.values()) {
      if (!documents.has(chunk.docId)) {
        documents.set(chunk.docId, {
          docId: chunk.docId,
          metadata: { ...chunk.metadata },
          chunkCount: 1
        });
        
        // Remove chunk-specific metadata
        delete documents.get(chunk.docId)!.metadata.chunkIndex;
        delete documents.get(chunk.docId)!.metadata.chunkCount;
      } else {
        documents.get(chunk.docId)!.chunkCount++;
      }
    }
    
    return Array.from(documents.values());
  }
  
  /**
   * Get a document by ID
   */
  getDocument(docId: string): { 
    docId: string; 
    metadata: Record<string, any>; 
    content: string;
    chunks: { id: string; content: string }[]
  } | null {
    const chunks: { id: string; content: string }[] = [];
    let metadata: Record<string, any> = {};
    let content = '';
    let foundChunks = false;
    
    // Collect all chunks for this document
    for (const chunk of this.chunks.values()) {
      if (chunk.docId === docId) {
        foundChunks = true;
        chunks.push({
          id: chunk.id,
          content: chunk.content
        });
        
        // Concatenate content
        content += chunk.content;
        
        // Use the first chunk's metadata as the document metadata
        if (Object.keys(metadata).length === 0) {
          metadata = { ...chunk.metadata };
          delete metadata.chunkIndex;
          delete metadata.chunkCount;
        }
      }
    }
    
    if (!foundChunks) {
      return null;
    }
    
    return {
      docId,
      metadata,
      content,
      chunks
    };
  }
}