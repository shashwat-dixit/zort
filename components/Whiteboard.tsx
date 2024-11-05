"use client"
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Toolbar } from './toolbar/Toolbar'
import { io, Socket } from 'socket.io-client';
import { Element, Point } from '@/types';

export const Whiteboard = ({ roomId }: { roomId: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [socket, setSocket] = useState<Socket | null>(null);

    const {
        elements,
        addElement,
        updateElement,
        tool,
        color,
        strokeWidth,
        user,
        zoom,
        offset,
        setZoom,
        setOffset,
        getTransformedPoint
    } = useStore();

    // Framer Motion values for pan and zoom
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const scale = useMotionValue(1);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentElement, setCurrentElement] = useState<Element | null>(null);

    // Initialize WebSocket connection
    useEffect(() => {
        const newSocket = io('http://localhost:3001');

        newSocket.emit('join-room', { roomId, user });

        newSocket.on('element-added', (element: Element) => {
            addElement(element);
        });

        newSocket.on('element-updated', (element: Element) => {
            updateElement(element.id, element);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [roomId, user]);

    // Handle mouse events
    const handlePointerDown = (e: React.PointerEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const point = getTransformedPoint({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        if (tool === 'pencil') {
            const newElement: Element = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'pencil',
                x: point.x,
                y: point.y,
                points: [{ x: 0, y: 0 }],
                color,
                strokeWidth,
            };
            setCurrentElement(newElement);
            setIsDrawing(true);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing || !currentElement || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const point = getTransformedPoint({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        if (currentElement.type === 'pencil' && currentElement.points) {
            const newPoints = [...currentElement.points, {
                x: point.x - currentElement.x,
                y: point.y - currentElement.y
            }];

            const updatedElement = {
                ...currentElement,
                points: newPoints
            };

            setCurrentElement(updatedElement);
        }
    };

    const handlePointerUp = () => {
        if (currentElement) {
            addElement(currentElement);
            socket?.emit('add-element', { roomId, element: currentElement });
        }
        setCurrentElement(null);
        setIsDrawing(false);
    };

    // Create grid pattern
    const createGridPattern = () => {
        const pattern = [];
        const gridSize = 20;
        const majorGridSize = gridSize * 5;

        // Minor grid lines
        for (let i = 0; i < 100; i++) {
            pattern.push(
                <line
                    key={`v-${i}`}
                    x1={i * gridSize}
                    y1={0}
                    x2={i * gridSize}
                    y2="100%"
                    stroke="#ddd"
                    strokeWidth={0.5}
                />,
                <line
                    key={`h-${i}`}
                    x1={0}
                    y1={i * gridSize}
                    x2="100%"
                    y2={i * gridSize}
                    stroke="#ddd"
                    strokeWidth={0.5}
                />
            );
        }

        // Major grid lines
        for (let i = 0; i < 20; i++) {
            pattern.push(
                <line
                    key={`v-major-${i}`}
                    x1={i * majorGridSize}
                    y1={0}
                    x2={i * majorGridSize}
                    y2="100%"
                    stroke="#ccc"
                    strokeWidth={1}
                />,
                <line
                    key={`h-major-${i}`}
                    x1={0}
                    y1={i * majorGridSize}
                    x2="100%"
                    y2={i * majorGridSize}
                    stroke="#ccc"
                    strokeWidth={1}
                />
            );
        }

        return pattern;
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-white">
            <Toolbar />

            <motion.div
                ref={containerRef}
                className="h-full w-full"
                style={{
                    x,
                    y,
                    scale,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <svg width="100%" height="100%">
                    <g>
                        {createGridPattern()}
                    </g>

                    {/* Render existing elements */}
                    {elements.map((element) => (
                        <RenderElement key={element.id} element={element} />
                    ))}

                    {/* Render current element being drawn */}
                    {currentElement && <RenderElement element={currentElement} />}
                </svg>
            </motion.div>
        </div>
    );
};

// Helper component to render different element types
const RenderElement = ({ element }: { element: Element }) => {
    switch (element.type) {
        case 'pencil':
            if (!element.points?.length) return null;
            const pathData = `M ${element.points[0].x} ${element.points[0].y} ` +
                element.points.slice(1).map(point => `L ${point.x} ${point.y}`).join(' ');
            return (
                <path
                    d={pathData}
                    transform={`translate(${element.x},${element.y})`}
                    stroke={element.color}
                    strokeWidth={element.strokeWidth}
                    fill="none"
                />
            );
        // Add other element type renderers here
        default:
            return null;
    }
};