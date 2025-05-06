import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { iconMap } from './CustomNode';
import { Progress } from '@/components/ui/progress';

const AnimatedNode: React.FC<NodeProps> = ({ id, data, isConnectable }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'queued' | 'processing' | 'completed' | 'error'>('queued');
  const { inputs = 1, outputs = 1 } = data;
  
  // Simulate progress changes based on data.progress updates
  useEffect(() => {
    if (data.progress !== undefined) {
      setProgress(data.progress);
    }
    
    if (data.phase) {
      setPhase(data.phase);
    }
  }, [data.progress, data.phase]);
  
  // Animate progress for demonstration when none is provided
  useEffect(() => {
    if (data.progress === undefined && phase === 'processing') {
      const interval = setInterval(() => {
        setProgress(p => {
          const next = p + 5;
          if (next >= 100) {
            clearInterval(interval);
            setPhase('completed');
            return 100;
          }
          return next;
        });
      }, 300);
      
      return () => clearInterval(interval);
    }
  }, [phase]);
  
  // Start processing after a delay
  useEffect(() => {
    if (phase === 'queued') {
      const timeout = setTimeout(() => {
        setPhase('processing');
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [phase]);
  
  // Get color and animation based on phase
  const getPhaseStyles = () => {
    switch (phase) {
      case 'queued':
        return { color: 'text-amber-500', borderColor: 'border-amber-500', bgColor: 'bg-amber-500' };
      case 'processing':
        return { color: 'text-blue-500', borderColor: 'border-blue-500', bgColor: 'bg-blue-500' };
      case 'completed':
        return { color: 'text-green-500', borderColor: 'border-green-500', bgColor: 'bg-green-500' };
      case 'error':
        return { color: 'text-red-500', borderColor: 'border-red-500', bgColor: 'bg-red-500' };
    }
  };
  
  const styles = getPhaseStyles();
  
  // Get icon based on data
  const IconComponent = data.icon ? iconMap[data.icon] : iconMap.HelpCircle;
  
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {/* Generate pulse animation when processing */}
      {phase === 'processing' && (
        <motion.div
          className={`absolute -inset-2 rounded-xl ${styles.borderColor} opacity-30`}
          initial={{ opacity: 0.2, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      
      {/* Input handles */}
      {Array.from({ length: inputs }).map((_, i) => (
        <Handle
          key={`input-${i}`}
          type="target"
          position={Position.Left}
          id={`input-${i}`}
          className={`w-3 h-3 rounded-full border-2 bg-white ${styles.borderColor}`}
          style={{ top: `${((i + 1) * 100) / (inputs + 1)}%` }}
          isConnectable={isConnectable}
        />
      ))}

      {/* Output handles */}
      {Array.from({ length: outputs }).map((_, i) => (
        <Handle
          key={`output-${i}`}
          type="source"
          position={Position.Right}
          id={`output-${i}`}
          className={`w-3 h-3 rounded-full border-2 bg-white ${styles.borderColor}`}
          style={{ top: `${((i + 1) * 100) / (outputs + 1)}%` }}
          isConnectable={isConnectable}
        />
      ))}
      
      <Card className={`shadow-md w-[220px] border-2 ${styles.borderColor}`}>
        <CardHeader className="py-2 px-3 flex flex-row items-center gap-2">
          <motion.div 
            className={styles.color}
            animate={phase === 'processing' ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <IconComponent className="h-5 w-5" />
          </motion.div>
          
          <CardTitle className="text-sm flex-1">
            {data.label || 'Node'}
          </CardTitle>
          
          <div className={`w-2 h-2 rounded-full ${styles.bgColor}`}></div>
        </CardHeader>
        
        <CardContent className="p-3">
          <div className="text-xs mb-2">
            {phase === 'queued' && 'Waiting to start...'}
            {phase === 'processing' && 'Processing...'}
            {phase === 'completed' && 'Completed successfully'}
            {phase === 'error' && 'Error occurred'}
          </div>
          
          <Progress value={progress} className="h-2" />
          
          {data.message && (
            <div className="mt-2 text-xs text-slate-500 overflow-hidden text-ellipsis">
              {data.message}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AnimatedNode;