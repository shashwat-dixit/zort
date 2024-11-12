"use client"
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Toolbar } from './toolbar/Toolbar';
import { Element, Point } from '@/types';

export const Whiteboard = ({ roomId }: { roomId: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const dragControls = useDragControls();

    const {
        elements,
        addElement,
        updateElement,
        deleteElement,
        tool,
        color,
        strokeWidth,
        user,
        zoom,
        offset,
        setZoom,
        setOffset,
        getTransformedPoint,
        selectedElement,
        setSelectedElement,
        isEditingText,
        setIsEditingText
    } = useStore();

    // Framer Motion values for pan and zoom
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const scale = useMotionValue(1);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentElement, setCurrentElement] = useState<Element | null>(null);
    const [startPoint, setStartPoint] = useState<Point | null>(null);

    useEffect(() => {
        scale.set(zoom);
    }, [zoom]);

    const createNewElement = (point: Point): Element => {
        const baseElement = {
            id: Math.random().toString(36).substr(2, 9),
            color,
            strokeWidth,
            x: point.x,
            y: point.y,
        };

        switch (tool) {
            case 'rectangle':
            case 'circle':
                return {
                    ...baseElement,
                    type: tool,
                    width: 0,
                    height: 0,
                };
            case 'text':
                return {
                    ...baseElement,
                    type: 'text',
                    text: '',
                    width: 100,
                    height: 20,
                };
            case 'pencil':
                return {
                    ...baseElement,
                    type: 'pencil',
                    points: [{ x: 0, y: 0 }],
                };
            case 'eraser':   // Add this case
                return {
                    ...baseElement,
                    type: 'pencil', // Use pencil type for eraser strokes
                    points: [{ x: 0, y: 0 }],
                    color: '#ffffff', // White color for eraser
                    strokeWidth: strokeWidth * 2, // Make eraser stroke wider
                };
            case 'select':   // Add this case
                return {       // This won't actually be used but satisfies TypeScript
                    ...baseElement,
                    type: 'pencil',
                    points: [{ x: 0, y: 0 }],
                };
            default:
                return {
                    ...baseElement,
                    type: 'pencil',
                    points: [{ x: 0, y: 0 }],
                };
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const point = getTransformedPoint({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        if (tool === 'select') {
            const clickedElement = elements.find(el =>
                point.x >= el.x &&
                point.x <= el.x + (el.width || 0) &&
                point.y >= el.y &&
                point.y <= el.y + (el.height || 0)
            );

            setSelectedElement(clickedElement || null);
            if (clickedElement?.type === 'text') {
                setIsEditingText(true);
            }
            return;
        }

        if (tool === 'eraser') {
            const elementToErase = elements.find(el =>
                point.x >= el.x &&
                point.x <= el.x + (el.width || 0) &&
                point.y >= el.y &&
                point.y <= el.y + (el.height || 0)
            );
            if (elementToErase) {
                deleteElement(elementToErase.id);
                socket?.emit('element-deleted', { roomId, elementId: elementToErase.id });
            }
            return;
        }

        setStartPoint(point);
        const newElement = createNewElement(point);
        setCurrentElement(newElement);
        setIsDrawing(true);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing || !currentElement || !startPoint || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const point = getTransformedPoint({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        const updatedElement = { ...currentElement };

        switch (currentElement.type) {
            case 'rectangle':
            case 'circle':
                updatedElement.width = point.x - startPoint.x;
                updatedElement.height = point.y - startPoint.y;
                break;

            case 'pencil':
                if (!updatedElement.points) return;
                updatedElement.points = [
                    ...updatedElement.points,
                    {
                        x: point.x - currentElement.x,
                        y: point.y - currentElement.y,
                    }
                ];
                break;

            case 'text':
                updatedElement.width = point.x - startPoint.x;
                updatedElement.height = point.y - startPoint.y;
                break;
        }

        setCurrentElement(updatedElement);
    };

    const handlePointerUp = () => {
        if (currentElement) {
            // Don't add empty elements
            if (
                currentElement.type === 'pencil' &&
                currentElement.points &&
                currentElement.points.length < 2
            ) {
                setCurrentElement(null);
                setIsDrawing(false);
                return;
            }

            addElement(currentElement);
            socket?.emit('add-element', { roomId, element: currentElement });
        }
        setCurrentElement(null);
        setIsDrawing(false);
        setStartPoint(null);
    };

    // Handle text editing
    const handleTextChange = (id: string, text: string) => {
        updateElement(id, { text });
        socket?.emit('element-updated', { roomId, elementId: id, changes: { text } });
    };

    const handleTextBlur = () => {
        setIsEditingText(false);
        setSelectedElement(null);
    };

    // Pan and zoom handlers
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(Math.min(Math.max(zoom + delta, 0.1), 5));
        } else {
            setOffset({
                x: offset.x - e.deltaX,
                y: offset.y - e.deltaY,
            });
        }
    };

    // Socket.io connection
    useEffect(() => {
        const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');

        newSocket.emit('join-room', { roomId, user });

        newSocket.on('element-added', (element: Element) => {
            addElement(element);
        });

        newSocket.on('element-updated', ({ elementId, changes }: { elementId: string, changes: Partial<Element> }) => {
            updateElement(elementId, changes);
        });

        newSocket.on('element-deleted', (elementId: string) => {
            deleteElement(elementId);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [roomId, user]);

    const RenderElement = ({ element, isSelected = false }: { element: Element, isSelected?: boolean }) => {
        const commonProps = {
            stroke: element.color,
            strokeWidth: element.strokeWidth,
            fill: "none",
        };

        switch (element.type) {
            case 'rectangle':
                return (
                    <rect
                        x={element.x}
                        y={element.y}
                        width={element.width || 0}
                        height={element.height || 0}
                        {...commonProps}
                    />
                );

            case 'circle':
                const rx = Math.abs((element.width || 0) / 2);
                const ry = Math.abs((element.height || 0) / 2);
                return (
                    <ellipse
                        cx={element.x + (element.width || 0) / 2}
                        cy={element.y + (element.height || 0) / 2}
                        rx={rx}
                        ry={ry}
                        {...commonProps}
                    />
                );

            case 'pencil':
                if (!element.points?.length) return null;
                const pathData = `M ${element.points[0].x} ${element.points[0].y} ` +
                    element.points.slice(1).map(point => `L ${point.x} ${point.y}`).join(' ');
                return (
                    <path
                        d={pathData}
                        transform={`translate(${element.x},${element.y})`}
                        {...commonProps}
                    />
                );

            case 'text':
                if (isEditingText && isSelected) {
                    return (
                        <foreignObject
                            x={element.x}
                            y={element.y}
                            width={element.width || 200}
                            height={element.height || 40}
                        >
                            <input
                                type="text"
                                value={element.text || ''}
                                onChange={(e) => handleTextChange(element.id, e.target.value)}
                                onBlur={handleTextBlur}
                                autoFocus
                                className="w-full h-full border-none bg-transparent outline-none"
                                style={{ color: element.color, fontSize: element.strokeWidth * 5 }}
                            />
                        </foreignObject>
                    );
                }
                return (
                    <text
                        x={element.x}
                        y={element.y + 20}
                        fill={element.color}
                        style={{ fontSize: element.strokeWidth * 5 }}
                        onDoubleClick={() => {
                            setSelectedElement(element);
                            setIsEditingText(true);
                        }}
                    >
                        {element.text || ''}
                    </text>
                );
        }
        return null;
    };

    return (
        <div
            className="h-screen w-screen overflow-hidden bg-white"
            onWheel={handleWheel}
        >
            <Toolbar />

            <motion.div
                ref={containerRef}
                className="h-full w-full cursor-crosshair"
                style={{
                    x,
                    y,
                    scale,
                    touchAction: 'none',
                }}
                drag={tool === 'select' && !isDrawing}
                dragControls={dragControls}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <svg width="100%" height="100%">
                    {/* Grid Pattern */}
                    <defs>
                        <pattern
                            id="grid"
                            width="40"
                            height="40"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 40 0 L 0 0 0 40"
                                fill="none"
                                stroke="#CCCCCC"
                                strokeWidth="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Render existing elements */}
                    {elements.map((element) => (
                        <g key={element.id}>
                            <RenderElement
                                element={element}
                                isSelected={selectedElement?.id === element.id}
                            />
                            {selectedElement?.id === element.id && (
                                <rect
                                    x={element.x - 2}
                                    y={element.y - 2}
                                    width={(element.width || 0) + 4}
                                    height={(element.height || 0) + 4}
                                    stroke="#0095ff"
                                    strokeWidth="1"
                                    fill="none"
                                    strokeDasharray="4 4"
                                />
                            )}
                        </g>
                    ))}

                    {/* Render current element being drawn */}
                    {currentElement && (
                        <RenderElement element={currentElement} />
                    )}
                </svg>
            </motion.div>
        </div>
    );
};

export default Whiteboard;