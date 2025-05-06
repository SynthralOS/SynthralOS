import React, { useMemo } from 'react';
import { EdgeProps, getBezierPath, useReactFlow } from 'reactflow';
import { motion, useAnimation } from 'framer-motion';

const AnimatedEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  const controls = useAnimation();
  const edgeStatus = data?.status || 'default';
  const isPulsing = data?.pulse || false;

  // Get stroke color based on status
  const getStrokeColor = () => {
    switch (edgeStatus) {
      case 'active':
        return '#3b82f6'; // Blue
      case 'success':
        return '#10b981'; // Green
      case 'error':
        return '#ef4444'; // Red
      case 'pending':
        return '#f59e0b'; // Amber
      default:
        return '#64748b'; // Slate
    }
  };

  const strokeColor = getStrokeColor();
  const strokeWidth = edgeStatus === 'active' ? 3 : 2;

  // Create bezier path for the edge
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Animate pulse effect when needed
  React.useEffect(() => {
    if (isPulsing) {
      controls.start({
        strokeWidth: [strokeWidth, strokeWidth + 2, strokeWidth],
        opacity: [1, 0.7, 1],
        transition: { 
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut" 
        }
      });
    } else {
      controls.stop();
      controls.set({
        strokeWidth: strokeWidth,
        opacity: 1
      });
    }
  }, [isPulsing, strokeWidth, controls]);

  // Flow effect animation along the edge
  const flowAnimation = edgeStatus === 'active' || edgeStatus === 'pending';

  return (
    <>
      {/* Background path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeOpacity={0.5}
        style={style}
        markerEnd={markerEnd}
      />
      
      {/* Animated path overlay */}
      <motion.path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        animate={controls}
        style={{ ...style, pointerEvents: 'none' }}
        markerEnd={markerEnd}
      />
      
      {/* Flow effect along the path */}
      {flowAnimation && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 1}
          strokeDasharray="10,10"
          className="animated-connection-path"
          style={{ 
            ...style, 
            strokeOpacity: 0.8, 
            pointerEvents: 'none' 
          }}
        />
      )}
    </>
  );
};

export default AnimatedEdge;