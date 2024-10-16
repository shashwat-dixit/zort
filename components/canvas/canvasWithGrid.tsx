import React from 'react';
import { motion } from 'framer-motion';

const CanvasWithGrid = ({ width, height, gridSize = 20, gridColor = '#e0e0e0' }) => {
    // Calculate the number of grid lines
    const horizontalLines = Math.floor(height / gridSize);
    const verticalLines = Math.floor(width / gridSize);

    return (
        <motion.svg
            width={width}
            height={height}
            style={{ border: '1px solid #ccc' }}
        >
            {/* Horizontal grid lines */}
            {Array.from({ length: horizontalLines + 1 }).map((_, index) => (
                <motion.line
                    key={`h-${index}`}
                    x1={0}
                    y1={index * gridSize}
                    x2={width}
                    y2={index * gridSize}
                    stroke={gridColor}
                    strokeWidth={1}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                />
            ))}

            {/* Vertical grid lines */}
            {Array.from({ length: verticalLines + 1 }).map((_, index) => (
                <motion.line
                    key={`v-${index}`}
                    x1={index * gridSize}
                    y1={0}
                    x2={index * gridSize}
                    y2={height}
                    stroke={gridColor}
                    strokeWidth={1}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                />
            ))}

            {/* You can add your shapes here */}
        </motion.svg>
    );
};

export default CanvasWithGrid;