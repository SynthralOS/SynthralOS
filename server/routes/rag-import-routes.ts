import { Router } from 'express';
import multer from 'multer';
import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { RagType } from '@shared/schema';

// Initialize router and multer
const router = Router();
const upload = multer({ dest: 'uploads/' });

// Memory store for import operations
const importOperations = new Map();

// API Endpoints

// Get supported file types and their configurations
router.get('/import/file-types', (req, res) => {
  res.json([
    {
      type: 'pdf',
      name: 'PDF Document',
      maxSize: 25 * 1024 * 1024, // 25MB
      supportedExtensions: ['.pdf'],
      description: 'Portable Document Format files. Supports text, tables, and images.',
      ocrSupported: true
    },
    {
      type: 'docx',
      name: 'Word Document',
      maxSize: 20 * 1024 * 1024, // 20MB
      supportedExtensions: ['.docx', '.doc'],
      description: 'Microsoft Word documents.',
      ocrSupported: false
    },
    {
      type: 'txt',
      name: 'Text File',
      maxSize: 5 * 1024 * 1024, // 5MB
      supportedExtensions: ['.txt', '.md', '.csv'],
      description: 'Plain text files. Most efficient for text-based RAG.',
      ocrSupported: false
    },
    {
      type: 'html',
      name: 'HTML Document',
      maxSize: 10 * 1024 * 1024, // 10MB
      supportedExtensions: ['.html', '.htm'],
      description: 'Web pages and HTML content.',
      ocrSupported: false
    },
    {
      type: 'image',
      name: 'Image',
      maxSize: 15 * 1024 * 1024, // 15MB
      supportedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
      description: 'Image files. Requires OCR or multimodal RAG.',
      ocrSupported: true
    },
    {
      type: 'json',
      name: 'JSON Data',
      maxSize: 15 * 1024 * 1024, // 15MB
      supportedExtensions: ['.json'],
      description: 'Structured data in JSON format.',
      ocrSupported: false
    },
    {
      type: 'xml',
      name: 'XML Data',
      maxSize: 15 * 1024 * 1024, // 15MB
      supportedExtensions: ['.xml'],
      description: 'Structured data in XML format.',
      ocrSupported: false
    }
  ]);
});

// Get supported external sources
router.get('/import/external-sources', (req, res) => {
  res.json([
    {
      id: 'web',
      name: 'Web URL',
      description: 'Import content from a specific URL or website',
      configOptions: [
        { name: 'url', type: 'string', required: true, description: 'The URL to crawl' },
        { name: 'maxPages', type: 'number', required: false, description: 'Maximum number of pages to crawl' },
        { name: 'crawlDepth', type: 'number', required: false, description: 'How deep to crawl from the starting URL' }
      ],
      authRequired: false
    },
    {
      id: 'gdrive',
      name: 'Google Drive',
      description: 'Import documents from Google Drive',
      configOptions: [
        { name: 'folderId', type: 'string', required: false, description: 'Optional folder ID to import from' }
      ],
      authRequired: true,
      authType: 'oauth'
    },
    {
      id: 'confluence',
      name: 'Confluence',
      description: 'Import content from Confluence workspace',
      configOptions: [
        { name: 'domain', type: 'string', required: true, description: 'Your Confluence domain' },
        { name: 'spaceKey', type: 'string', required: false, description: 'Optional space key to limit import scope' }
      ],
      authRequired: true,
      authType: 'api_key'
    },
    {
      id: 'sharepoint',
      name: 'SharePoint',
      description: 'Import documents from Microsoft SharePoint',
      configOptions: [
        { name: 'siteUrl', type: 'string', required: true, description: 'SharePoint site URL' },
        { name: 'libraryName', type: 'string', required: false, description: 'Document library name' }
      ],
      authRequired: true,
      authType: 'oauth'
    },
    {
      id: 'github',
      name: 'GitHub Repository',
      description: 'Import code and documentation from GitHub',
      configOptions: [
        { name: 'repoUrl', type: 'string', required: true, description: 'GitHub repository URL' },
        { name: 'branch', type: 'string', required: false, description: 'Branch to import (defaults to main)' },
        { name: 'fileTypes', type: 'array', required: false, description: 'File extensions to include' }
      ],
      authRequired: true,
      authType: 'oauth'
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Import content from Notion workspace',
      configOptions: [
        { name: 'databaseId', type: 'string', required: false, description: 'Optional database ID to import' }
      ],
      authRequired: true,
      authType: 'api_key'
    }
  ]);
});

// Upload file for processing
router.post('/import/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { originalname, path: filePath, size, mimetype } = req.file;
    const { targetSystemId, chunkSize, overlapSize, metadata } = req.body;
    
    // Validate request
    if (!targetSystemId) {
      // Clean up the uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: 'Target RAG system ID is required' });
    }
    
    // Generate operation ID
    const operationId = uuidv4();
    
    // Store operation details
    const operation = {
      operationId,
      originalFilename: originalname,
      filePath,
      fileSize: size,
      mimeType: mimetype,
      targetSystemId: parseInt(targetSystemId),
      metadata: metadata ? JSON.parse(metadata) : {},
      status: 'queued',
      progress: 0,
      chunksCreated: 0,
      documentsProcessed: 0,
      totalDocuments: 1, // For file upload, it's just 1 document
      startTime: new Date().toISOString(),
      errors: [],
      warnings: []
    };
    
    importOperations.set(operationId, operation);
    
    // Begin processing in background (simulated)
    setTimeout(() => {
      simulateImportProgress(operationId, 1);
    }, 1000);
    
    // Return operation details to client
    res.json({
      operationId,
      status: 'queued',
      fileName: originalname,
      fileSize: size,
      targetSystem: targetSystemId
    });
  } catch (error: any) {
    // Clean up if possible
    if (req.file?.path) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: error.message });
  }
});

// Start import from external source
router.post('/import/external', (req, res) => {
  try {
    const { sourceType, sourceConfig, targetSystemId, options } = req.body;
    
    // Validate request
    if (!sourceType || !targetSystemId) {
      return res.status(400).json({ 
        message: 'Source type and target system ID are required' 
      });
    }
    
    // Generate operation ID
    const operationId = uuidv4();
    
    // Estimate number of documents based on source type
    let estimatedDocuments = 1;
    switch (sourceType) {
      case 'web':
        estimatedDocuments = sourceConfig.maxPages || 5;
        break;
      case 'gdrive':
      case 'sharepoint':
      case 'confluence':
      case 'notion':
        estimatedDocuments = 10; // Mock estimate
        break;
      case 'github':
        estimatedDocuments = 20; // Mock estimate for code files
        break;
    }
    
    // Store operation details
    const operation = {
      operationId,
      sourceType,
      sourceConfig,
      targetSystemId: parseInt(targetSystemId),
      options: options || {},
      status: 'queued',
      progress: 0,
      chunksCreated: 0,
      documentsProcessed: 0,
      totalDocuments: estimatedDocuments,
      startTime: new Date().toISOString(),
      errors: [],
      warnings: []
    };
    
    importOperations.set(operationId, operation);
    
    // Begin processing in background (simulated)
    setTimeout(() => {
      simulateImportProgress(operationId, estimatedDocuments);
    }, 1000);
    
    // Return operation details to client
    res.json({
      operationId,
      status: 'queued',
      sourceType,
      targetSystem: targetSystemId,
      estimatedDocuments
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get status of import operation
router.get('/import/status/:operationId', (req, res) => {
  try {
    const { operationId } = req.params;
    
    if (!importOperations.has(operationId)) {
      return res.status(404).json({ message: 'Import operation not found' });
    }
    
    const operation = importOperations.get(operationId);
    res.json(operation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel an import operation
router.post('/import/cancel/:operationId', (req, res) => {
  try {
    const { operationId } = req.params;
    
    if (!importOperations.has(operationId)) {
      return res.status(404).json({ message: 'Import operation not found' });
    }
    
    const operation = importOperations.get(operationId);
    
    // Only allow cancellation if not already completed or failed
    if (operation.status === 'completed' || operation.status === 'failed') {
      return res.status(400).json({ 
        message: `Cannot cancel operation with status: ${operation.status}` 
      });
    }
    
    // Update operation status
    operation.status = 'cancelled';
    operation.endTime = new Date().toISOString();
    importOperations.set(operationId, operation);
    
    // Clean up any files if necessary
    if (operation.filePath && fs.existsSync(operation.filePath)) {
      fs.unlinkSync(operation.filePath);
    }
    
    res.json({ 
      operationId, 
      status: 'cancelled',
      message: 'Import operation cancelled successfully' 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get all active import operations
router.get('/import/operations', (req, res) => {
  try {
    const operations = Array.from(importOperations.values()).filter(op => 
      op.status === 'queued' || op.status === 'processing'
    );
    
    res.json(operations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Simulates the progress of an import operation
function simulateImportProgress(operationId: string, totalDocuments: number) {
  const operation = importOperations.get(operationId);
  if (!operation) return;
  
  // Update status to processing
  operation.status = 'processing';
  importOperations.set(operationId, operation);
  
  let progress = 0;
  const interval = setInterval(() => {
    if (!importOperations.has(operationId)) {
      clearInterval(interval);
      return;
    }
    
    const op = importOperations.get(operationId);
    
    // If cancelled, stop simulation
    if (op.status === 'cancelled') {
      clearInterval(interval);
      return;
    }
    
    // Increment progress
    progress += 5 + Math.random() * 10;
    if (progress > 100) progress = 100;
    
    // Update the operation
    op.progress = Math.floor(progress);
    op.documentsProcessed = Math.floor((progress / 100) * totalDocuments);
    op.chunksCreated = Math.floor(op.documentsProcessed * (3 + Math.random() * 5));
    
    // Add occasional warnings
    if (progress > 40 && progress < 45 && op.warnings.length === 0) {
      op.warnings.push('Some documents contain special formatting that may not be preserved');
    }
    
    // Decide if the operation should fail (for demo purposes)
    const shouldFail = operationId.includes('error') || (operationId.includes('5') && progress > 70);
    
    if (shouldFail) {
      op.status = 'failed';
      op.errors.push('Failed to process document: invalid format or corrupted content');
      op.endTime = new Date().toISOString();
      clearInterval(interval);
    } else if (progress >= 100) {
      op.status = 'completed';
      op.progress = 100;
      op.documentsProcessed = totalDocuments;
      op.endTime = new Date().toISOString();
      clearInterval(interval);
    }
    
    importOperations.set(operationId, op);
  }, 1000);
}

export default router;