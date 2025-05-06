import React from 'react';
import { ConnectionLineComponentProps, getBezierPath } from 'reactflow';
import { motion } from 'framer-motion';

export default function ConnectionLine({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
}: ConnectionLineComponentProps) {
  // Calculate the path based on positions
  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  return (
    <>
      <g>
        <path
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          className="react-flow__edge-path"
          d={edgePath}
          strokeDasharray="5,5"
        />
      </g>
      <motion.path
        fill="none"
        stroke="#3b82f6"
        strokeOpacity={0.6}
        strokeWidth={4}
        d={edgePath}
        initial={{ strokeDashoffset: 0, strokeDasharray: '5,5' }}
        animate={{
          strokeDashoffset: 20
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </>
  );
}