import { RagType } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// Compatibility matrix for different RAG system types
const COMPATIBILITY_MATRIX: Record<RagType, Record<RagType, number>> = {
  [RagType.LightRAG]: {
    [RagType.LightRAG]: 100,      // Perfect compatibility with itself
    [RagType.PineconeRAG]: 90,    // Excellent compatibility
    [RagType.QdrantRAG]: 90,      // Excellent compatibility
    [RagType.ChromaRAG]: 85,      // Very good compatibility
    [RagType.PgVectorRAG]: 90,    // Excellent compatibility
    [RagType.SemanticRAG]: 80,    // Good compatibility
    [RagType.HybridRAG]: 75,      // Good compatibility
    [RagType.CodeRAG]: 60,        // Moderate compatibility (may lose specialized code indexing)
    [RagType.LegalRAG]: 60,       // Moderate compatibility (may lose specialized legal features)
    [RagType.LlamaIndexRAG]: 85,  // Very good compatibility
    [RagType.MultimodalRAG]: 40,  // Low compatibility (does not support images)
    [RagType.Custom]: 50          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.PineconeRAG]: {
    [RagType.LightRAG]: 70,       // Good but may lose some vector DB specific features
    [RagType.PineconeRAG]: 100,   // Perfect compatibility with itself
    [RagType.QdrantRAG]: 90,      // Excellent compatibility
    [RagType.ChromaRAG]: 85,      // Very good compatibility
    [RagType.PgVectorRAG]: 85,    // Very good compatibility 
    [RagType.SemanticRAG]: 90,    // Excellent compatibility
    [RagType.HybridRAG]: 80,      // Good compatibility
    [RagType.CodeRAG]: 75,        // Good compatibility
    [RagType.LegalRAG]: 75,       // Good compatibility
    [RagType.LlamaIndexRAG]: 80,  // Good compatibility
    [RagType.MultimodalRAG]: 65,  // Moderate compatibility (may need vector transformation)
    [RagType.Custom]: 60          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.QdrantRAG]: {
    [RagType.LightRAG]: 70,       // Good but may lose some vector DB specific features
    [RagType.PineconeRAG]: 90,    // Excellent compatibility
    [RagType.QdrantRAG]: 100,     // Perfect compatibility with itself
    [RagType.ChromaRAG]: 85,      // Very good compatibility
    [RagType.PgVectorRAG]: 85,    // Very good compatibility
    [RagType.SemanticRAG]: 90,    // Excellent compatibility
    [RagType.HybridRAG]: 85,      // Very good compatibility
    [RagType.CodeRAG]: 80,        // Good compatibility
    [RagType.LegalRAG]: 80,       // Good compatibility
    [RagType.LlamaIndexRAG]: 80,  // Good compatibility
    [RagType.MultimodalRAG]: 75,  // Good compatibility (better support for multimodal)
    [RagType.Custom]: 60          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.ChromaRAG]: {
    [RagType.LightRAG]: 70,       // Good but may lose some vector DB specific features
    [RagType.PineconeRAG]: 85,    // Very good compatibility
    [RagType.QdrantRAG]: 85,      // Very good compatibility
    [RagType.ChromaRAG]: 100,     // Perfect compatibility with itself
    [RagType.PgVectorRAG]: 80,    // Good compatibility
    [RagType.SemanticRAG]: 85,    // Very good compatibility
    [RagType.HybridRAG]: 80,      // Good compatibility
    [RagType.CodeRAG]: 70,        // Good compatibility
    [RagType.LegalRAG]: 70,       // Good compatibility
    [RagType.LlamaIndexRAG]: 80,  // Good compatibility
    [RagType.MultimodalRAG]: 80,  // Good compatibility (good support for multimodal)
    [RagType.Custom]: 60          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.PgVectorRAG]: {
    [RagType.LightRAG]: 75,       // Good compatibility
    [RagType.PineconeRAG]: 85,    // Very good compatibility
    [RagType.QdrantRAG]: 85,      // Very good compatibility
    [RagType.ChromaRAG]: 80,      // Good compatibility
    [RagType.PgVectorRAG]: 100,   // Perfect compatibility with itself
    [RagType.SemanticRAG]: 85,    // Very good compatibility
    [RagType.HybridRAG]: 80,      // Good compatibility
    [RagType.CodeRAG]: 75,        // Good compatibility
    [RagType.LegalRAG]: 75,       // Good compatibility
    [RagType.LlamaIndexRAG]: 75,  // Good compatibility
    [RagType.MultimodalRAG]: 60,  // Moderate compatibility
    [RagType.Custom]: 60          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.SemanticRAG]: {
    [RagType.LightRAG]: 70,       // Good but may lose specialized semantic features
    [RagType.PineconeRAG]: 85,    // Very good compatibility
    [RagType.QdrantRAG]: 85,      // Very good compatibility
    [RagType.ChromaRAG]: 80,      // Good compatibility
    [RagType.PgVectorRAG]: 80,    // Good compatibility
    [RagType.SemanticRAG]: 100,   // Perfect compatibility with itself
    [RagType.HybridRAG]: 90,      // Excellent compatibility
    [RagType.CodeRAG]: 80,        // Good compatibility
    [RagType.LegalRAG]: 80,       // Good compatibility
    [RagType.LlamaIndexRAG]: 85,  // Very good compatibility
    [RagType.MultimodalRAG]: 70,  // Good compatibility
    [RagType.Custom]: 60          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.HybridRAG]: {
    [RagType.LightRAG]: 65,       // Moderate compatibility (loses keyword search)
    [RagType.PineconeRAG]: 75,    // Good compatibility (loses keyword capabilities)
    [RagType.QdrantRAG]: 75,      // Good compatibility (loses keyword capabilities)
    [RagType.ChromaRAG]: 75,      // Good compatibility (loses keyword capabilities)
    [RagType.PgVectorRAG]: 80,    // Good compatibility (PG has text search)
    [RagType.SemanticRAG]: 80,    // Good compatibility (loses keyword search)
    [RagType.HybridRAG]: 100,     // Perfect compatibility with itself
    [RagType.CodeRAG]: 80,        // Good compatibility
    [RagType.LegalRAG]: 80,       // Good compatibility
    [RagType.LlamaIndexRAG]: 85,  // Very good compatibility
    [RagType.MultimodalRAG]: 70,  // Good compatibility
    [RagType.Custom]: 65          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.CodeRAG]: {
    [RagType.LightRAG]: 60,       // Moderate compatibility (loses specialized code features)
    [RagType.PineconeRAG]: 70,    // Good compatibility
    [RagType.QdrantRAG]: 70,      // Good compatibility
    [RagType.ChromaRAG]: 65,      // Moderate compatibility
    [RagType.PgVectorRAG]: 70,    // Good compatibility
    [RagType.SemanticRAG]: 75,    // Good compatibility
    [RagType.HybridRAG]: 80,      // Good compatibility
    [RagType.CodeRAG]: 100,       // Perfect compatibility with itself
    [RagType.LegalRAG]: 50,       // Moderate compatibility (different domains)
    [RagType.LlamaIndexRAG]: 80,  // Good compatibility
    [RagType.MultimodalRAG]: 50,  // Moderate compatibility
    [RagType.Custom]: 60          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.LegalRAG]: {
    [RagType.LightRAG]: 60,       // Moderate compatibility (loses specialized legal features)
    [RagType.PineconeRAG]: 70,    // Good compatibility
    [RagType.QdrantRAG]: 70,      // Good compatibility
    [RagType.ChromaRAG]: 65,      // Moderate compatibility
    [RagType.PgVectorRAG]: 70,    // Good compatibility
    [RagType.SemanticRAG]: 75,    // Good compatibility
    [RagType.HybridRAG]: 80,      // Good compatibility
    [RagType.CodeRAG]: 50,        // Moderate compatibility (different domains)
    [RagType.LegalRAG]: 100,      // Perfect compatibility with itself
    [RagType.LlamaIndexRAG]: 80,  // Good compatibility
    [RagType.MultimodalRAG]: 50,  // Moderate compatibility
    [RagType.Custom]: 60          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.LlamaIndexRAG]: {
    [RagType.LightRAG]: 75,       // Good compatibility
    [RagType.PineconeRAG]: 80,    // Good compatibility
    [RagType.QdrantRAG]: 80,      // Good compatibility
    [RagType.ChromaRAG]: 80,      // Good compatibility
    [RagType.PgVectorRAG]: 75,    // Good compatibility
    [RagType.SemanticRAG]: 85,    // Very good compatibility
    [RagType.HybridRAG]: 85,      // Very good compatibility
    [RagType.CodeRAG]: 80,        // Good compatibility
    [RagType.LegalRAG]: 80,       // Good compatibility
    [RagType.LlamaIndexRAG]: 100, // Perfect compatibility with itself
    [RagType.MultimodalRAG]: 75,  // Good compatibility
    [RagType.Custom]: 70          // Good compatibility (depends on custom implementation)
  },
  [RagType.MultimodalRAG]: {
    [RagType.LightRAG]: 40,       // Low compatibility (loses image support)
    [RagType.PineconeRAG]: 65,    // Moderate compatibility
    [RagType.QdrantRAG]: 75,      // Good compatibility
    [RagType.ChromaRAG]: 80,      // Good compatibility (good multimodal support)
    [RagType.PgVectorRAG]: 60,    // Moderate compatibility
    [RagType.SemanticRAG]: 70,    // Good compatibility
    [RagType.HybridRAG]: 70,      // Good compatibility
    [RagType.CodeRAG]: 50,        // Moderate compatibility
    [RagType.LegalRAG]: 50,       // Moderate compatibility
    [RagType.LlamaIndexRAG]: 75,  // Good compatibility
    [RagType.MultimodalRAG]: 100, // Perfect compatibility with itself
    [RagType.Custom]: 65          // Moderate compatibility (depends on custom implementation)
  },
  [RagType.Custom]: {
    [RagType.LightRAG]: 50,       // Moderate compatibility
    [RagType.PineconeRAG]: 60,    // Moderate compatibility
    [RagType.QdrantRAG]: 60,      // Moderate compatibility
    [RagType.ChromaRAG]: 60,      // Moderate compatibility
    [RagType.PgVectorRAG]: 60,    // Moderate compatibility
    [RagType.SemanticRAG]: 60,    // Moderate compatibility
    [RagType.HybridRAG]: 65,      // Moderate compatibility
    [RagType.CodeRAG]: 60,        // Moderate compatibility
    [RagType.LegalRAG]: 60,       // Moderate compatibility
    [RagType.LlamaIndexRAG]: 70,  // Good compatibility
    [RagType.MultimodalRAG]: 65,  // Moderate compatibility
    [RagType.Custom]: 100         // Perfect compatibility with itself (but depends on implementation)
  }
};

// Interface for compatibility information
export interface CompatibilityInfo {
  compatibilityScore: number;
  features: {
    preserved: string[];
    degraded: string[];
    lost: string[];
  };
  transferComplexity: 'simple' | 'moderate' | 'complex';
  warnings: string[];
  recommendations: string[];
}

// Interface for transfer recommendations
export interface TransferRecommendations {
  batchSize: number;
  estimatedTime: string;
  preserveMetadata: boolean;
  reembedding: boolean;
  dataTransformation: boolean;
  recommendations: string[];
}

// Interface for transfer results
export interface TransferResult {
  operationId: string;
  sourceId: number;
  targetId: number;
  documentIds: string[];
  compatibility: number;
  startTime: string;
}

export class RagDbSwitchNode {
  constructor() {
    // Initialize any necessary resources
  }
  
  /**
   * Get compatibility information between two RAG system types
   */
  getCompatibilityInfo(sourceType: RagType, targetType: RagType): CompatibilityInfo {
    // Get the compatibility score from the matrix
    const compatibilityScore = COMPATIBILITY_MATRIX[sourceType][targetType] || 0;
    
    // Generate feature compatibility details
    const features = this.getFeaturesCompatibility(sourceType, targetType);
    
    // Determine transfer complexity
    let transferComplexity: 'simple' | 'moderate' | 'complex';
    if (compatibilityScore >= 80) {
      transferComplexity = 'simple';
    } else if (compatibilityScore >= 60) {
      transferComplexity = 'moderate';
    } else {
      transferComplexity = 'complex';
    }
    
    // Generate warnings based on compatibility issues
    const warnings = this.getCompatibilityWarnings(sourceType, targetType, compatibilityScore);
    
    // Generate recommendations for transfer
    const recommendations = this.getTransferRecommendations(sourceType, targetType);
    
    return {
      compatibilityScore,
      features,
      transferComplexity,
      warnings,
      recommendations
    };
  }
  
  /**
   * Get transfer recommendations based on document count
   */
  getTransferRecommendations(sourceType: RagType, targetType: RagType, documentCount: number = 10): TransferRecommendations {
    // Determine batch size based on document count and compatibility
    const compatibilityScore = COMPATIBILITY_MATRIX[sourceType][targetType] || 0;
    let batchSize = 10;
    
    if (documentCount > 1000) {
      batchSize = 100;
    } else if (documentCount > 100) {
      batchSize = 50;
    } else if (documentCount > 10) {
      batchSize = 20;
    }
    
    // Adjust batch size based on compatibility
    if (compatibilityScore < 60) {
      batchSize = Math.max(5, Math.floor(batchSize / 2));
    }
    
    // Determine if re-embedding is needed
    const reembedding = this.needsReembedding(sourceType, targetType);
    
    // Determine if metadata preservation is possible
    const preserveMetadata = compatibilityScore >= 70;
    
    // Determine if data transformation is needed
    const dataTransformation = compatibilityScore < 80;
    
    // Estimate time for transfer (simplified calculation)
    const baseTimePerDoc = reembedding ? 2 : 0.5; // seconds per document
    const totalEstimatedSeconds = baseTimePerDoc * documentCount * (100 / compatibilityScore);
    const estimatedTime = this.formatEstimatedTime(totalEstimatedSeconds);
    
    // Generate specific recommendations
    const recommendations = this.generateTransferRecommendations(
      sourceType, 
      targetType, 
      documentCount,
      reembedding,
      preserveMetadata,
      dataTransformation
    );
    
    return {
      batchSize,
      estimatedTime,
      preserveMetadata,
      reembedding,
      dataTransformation,
      recommendations
    };
  }
  
  /**
   * Start transfer of documents between RAG systems
   */
  async transferDocuments(sourceId: number, targetId: number, documentIds: string[]): Promise<TransferResult> {
    // In a real implementation, this would initiate an async transfer process
    // For now, we just return an operation ID that can be used to track progress
    const operationId = uuidv4();
    
    // Mock compatibility score for demo
    const compatibility = 85;
    
    const result: TransferResult = {
      operationId,
      sourceId,
      targetId,
      documentIds,
      compatibility,
      startTime: new Date().toISOString()
    };
    
    // In a real implementation, we would now start the actual transfer process
    // as an async background task
    
    return result;
  }
  
  /**
   * Get status of transfer operation
   */
  async getTransferStatus(operationId: string): Promise<any> {
    // In a real implementation, this would query the status of the transfer operation
    // For now, we just return a mock status
    return {
      operationId,
      status: 'in_progress',
      progress: 50,
      documentsProcessed: 5,
      totalDocuments: 10,
      startTime: new Date().toISOString(),
      errors: [],
      warnings: []
    };
  }
  
  /**
   * Helper method to get feature compatibility details
   */
  private getFeaturesCompatibility(sourceType: RagType, targetType: RagType): {
    preserved: string[];
    degraded: string[];
    lost: string[];
  } {
    const compatibilityScore = COMPATIBILITY_MATRIX[sourceType][targetType] || 0;
    
    const preserved: string[] = [];
    const degraded: string[] = [];
    const lost: string[] = [];
    
    // Base document storage is always preserved
    preserved.push('Base document storage');
    preserved.push('Text search capability');
    
    // Add features based on source and target type combinations
    switch (sourceType) {
      case RagType.LightRAG:
        if (targetType === RagType.LightRAG) {
          preserved.push('Document metadata');
          preserved.push('Simple embedding structure');
        } else if ([RagType.PineconeRAG, RagType.QdrantRAG, RagType.PgVectorRAG].includes(targetType)) {
          preserved.push('Document metadata');
          degraded.push('Simple embedding structure');
          preserved.push('Advanced vector search');
        } else if (targetType === RagType.MultimodalRAG) {
          degraded.push('Document metadata');
          lost.push('Simple embedding structure');
          preserved.push('Advanced vector search');
        }
        break;
        
      case RagType.CodeRAG:
        if (targetType === RagType.CodeRAG) {
          preserved.push('Code-specific embeddings');
          preserved.push('Symbol extraction');
          preserved.push('Function/class indexing');
        } else {
          degraded.push('Code-specific embeddings');
          lost.push('Symbol extraction');
          lost.push('Function/class indexing');
        }
        break;
        
      case RagType.MultimodalRAG:
        if (targetType === RagType.MultimodalRAG) {
          preserved.push('Image embedding support');
          preserved.push('Mixed text-image retrieval');
        } else {
          lost.push('Image embedding support');
          lost.push('Mixed text-image retrieval');
          if (targetType === RagType.ChromaRAG) {
            degraded.push('Some multimedia capabilities');
          }
        }
        break;
        
      case RagType.HybridRAG:
        if (targetType === RagType.HybridRAG) {
          preserved.push('Combined semantic-keyword search');
          preserved.push('Multiple retrieval methods');
        } else if (targetType === RagType.SemanticRAG) {
          degraded.push('Combined semantic-keyword search');
          degraded.push('Multiple retrieval methods');
        } else {
          lost.push('Combined semantic-keyword search');
          degraded.push('Multiple retrieval methods');
        }
        break;
    }
    
    // Special case for LlamaIndexRAG (it has good compatibility with most systems)
    if (sourceType === RagType.LlamaIndexRAG) {
      if (targetType === RagType.LlamaIndexRAG) {
        preserved.push('Advanced indexing structures');
        preserved.push('Complex query routing');
      } else {
        degraded.push('Advanced indexing structures');
        degraded.push('Complex query routing');
      }
    }
    
    // Add features based on compatibility score
    if (compatibilityScore >= 90) {
      preserved.push('Most specialized features');
    } else if (compatibilityScore >= 70) {
      degraded.push('Some specialized features');
    } else {
      lost.push('Most specialized features');
    }
    
    return { preserved, degraded, lost };
  }
  
  /**
   * Helper method to get warnings based on compatibility
   */
  private getCompatibilityWarnings(sourceType: RagType, targetType: RagType, compatibilityScore: number): string[] {
    const warnings: string[] = [];
    
    if (compatibilityScore < 50) {
      warnings.push('Very low compatibility - significant data loss is likely');
    }
    
    if (sourceType === RagType.MultimodalRAG && targetType !== RagType.MultimodalRAG) {
      warnings.push('Image/multimodal content will not be transferred or will lose associated metadata');
    }
    
    if (sourceType === RagType.CodeRAG && targetType !== RagType.CodeRAG) {
      warnings.push('Code-specific features like symbol extraction will be lost');
    }
    
    if (sourceType === RagType.LegalRAG && targetType !== RagType.LegalRAG) {
      warnings.push('Legal-specific metadata and classification may be lost');
    }
    
    if (compatibilityScore < 70) {
      warnings.push('Some document metadata may not be preserved during transfer');
    }
    
    if (this.needsReembedding(sourceType, targetType)) {
      warnings.push('Documents will need to be re-embedded, which may change retrieval behavior');
    }
    
    return warnings;
  }
  
  /**
   * Helper method to generate transfer recommendations
   */
  private generateTransferRecommendations(
    sourceType: RagType,
    targetType: RagType,
    documentCount: number,
    reembedding: boolean,
    preserveMetadata: boolean,
    dataTransformation: boolean
  ): string[] {
    const recommendations: string[] = [];
    
    // Add batch size recommendations
    if (documentCount > 1000) {
      recommendations.push('Consider breaking the transfer into multiple smaller operations');
    }
    
    // Add recommendations based on feature compatibility
    if (reembedding) {
      recommendations.push('Verify retrieval quality after transfer as embeddings will be regenerated');
    }
    
    if (!preserveMetadata) {
      recommendations.push('Export metadata separately before transfer to avoid losing critical information');
    }
    
    if (dataTransformation) {
      recommendations.push('Review document structure after transfer to ensure proper transformation');
    }
    
    // Add recommendations for specific source -> target migrations
    if (sourceType === RagType.MultimodalRAG && targetType !== RagType.MultimodalRAG) {
      recommendations.push('Consider keeping the original MultimodalRAG system for image content');
    }
    
    if (sourceType === RagType.CodeRAG && targetType !== RagType.CodeRAG) {
      recommendations.push('Pre-process code documents to extract and preserve important symbols as plaintext');
    }
    
    if (sourceType === RagType.LightRAG && targetType !== RagType.LightRAG) {
      recommendations.push('LightRAG is simple - the target system should be able to handle all content effectively');
    }
    
    if (targetType === RagType.PineconeRAG || targetType === RagType.QdrantRAG) {
      recommendations.push('Configure vector dimensions and index settings before transfer for optimal performance');
    }
    
    if (targetType === RagType.HybridRAG) {
      recommendations.push('Set up both semantic and keyword indices for best results after transfer');
    }
    
    // Add system-specific recommendations
    switch (targetType) {
      case RagType.PgVectorRAG:
        recommendations.push('Ensure PostgreSQL instance has sufficient resources for the vector data');
        break;
      case RagType.LlamaIndexRAG:
        recommendations.push('Configure index type in LlamaIndex to match your retrieval pattern needs');
        break;
      case RagType.SemanticRAG:
        recommendations.push('Consider adjusting semantic search parameters after transfer for best results');
        break;
    }
    
    return recommendations;
  }
  
  /**
   * Helper to determine if re-embedding is needed
   */
  private needsReembedding(sourceType: RagType, targetType: RagType): boolean {
    // Cases where re-embedding is definitely needed
    if (
      (sourceType === RagType.MultimodalRAG && targetType !== RagType.MultimodalRAG) ||
      (sourceType === RagType.CodeRAG && targetType !== RagType.CodeRAG) ||
      (sourceType === RagType.LegalRAG && targetType !== RagType.LegalRAG)
    ) {
      return true;
    }
    
    // Different standard embedding dimensions or algorithms
    const differentEmbeddingSystems = [
      // System pairs that need re-embedding
      [RagType.LightRAG, RagType.SemanticRAG],
      [RagType.LightRAG, RagType.HybridRAG],
      [RagType.PineconeRAG, RagType.ChromaRAG],
      [RagType.PgVectorRAG, RagType.QdrantRAG]
    ];
    
    return differentEmbeddingSystems.some(pair => 
      (pair[0] === sourceType && pair[1] === targetType) ||
      (pair[0] === targetType && pair[1] === sourceType)
    );
  }
  
  /**
   * Format estimated time in a human-readable way
   */
  private formatEstimatedTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)} minutes`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
}