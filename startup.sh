#!/bin/bash

# Startup script for production deployment
# This script handles the package.json type field to ensure compatibility with both ESM and CommonJS

# Check if running in production
if [ "$NODE_ENV" == "production" ]; then
  echo "Running in production mode, adjusting package.json for compatibility"
  
  # Create temporary package.json with type module and commonjs compatibility
  jq 'del(.type)' package.json > package.tmp.json
  
  # Overwrite the original with the modified version
  mv package.tmp.json package.json
  
  echo "Updated package.json for production compatibility"
fi

# Start the application
echo "Starting the application..."
if [ "$NODE_ENV" == "production" ]; then
  node dist/index.js
else
  echo "Not in production, exiting startup script"
  exit 0
fi