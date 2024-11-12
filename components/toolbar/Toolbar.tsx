import { useEffect, useRef, useState } from 'react';
import {
    Square, Circle, Type, Pencil, MousePointer,
    Eraser, Trash2, Undo, Redo, Move
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ElementType } from '@/types';
import { cn } from '@/lib/utils';

export const Toolbar = () => {
    const {
        tool, setTool,
        color, setColor,
        strokeWidth, setStrokeWidth,
        clearCanvas, undo, redo,
        zoom, setZoom
    } = useStore();

    const tools = [
        { type: 'select' as ElementType, icon: <MousePointer className="h-4 w-4" /> },
        { type: 'rectangle' as ElementType, icon: <Square className="h-4 w-4" /> },
        { type: 'circle' as ElementType, icon: <Circle className="h-4 w-4" /> },
        { type: 'text' as ElementType, icon: <Type className="h-4 w-4" /> },
        { type: 'pencil' as ElementType, icon: <Pencil className="h-4 w-4" /> },
        { type: 'eraser' as ElementType, icon: <Eraser className="h-4 w-4" /> },
    ];

    const handleZoom = (zoomIn: boolean) => {
        setZoom(Math.min(Math.max(zoom + (zoomIn ? 0.1 : -0.1), 0.1), 5));
    };

    // Add keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    if (e.shiftKey) {
                        e.preventDefault();
                        redo();
                    } else {
                        e.preventDefault();
                        undo();
                    }
                }
            }

            // Space bar for pan tool
            if (e.code === 'Space') {
                e.preventDefault();
                setTool('select');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-2">
            <div className="flex items-center gap-2">
                <div className="flex gap-1 border-r pr-2">
                    {tools.map((t) => (
                        <Button
                            key={t.type}
                            variant={tool === t.type ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setTool(t.type)}
                            className="w-8 h-8"
                        >
                            {t.icon}
                        </Button>
                    ))}
                </div>

                <div className="flex gap-1 border-r pr-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8"
                                style={{ backgroundColor: color }}
                            />
                        </PopoverTrigger>
                        <PopoverContent className="w-48">
                            <div className="grid grid-cols-5 gap-1">
                                {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
                                    '#FF00FF', '#00FFFF', '#808080', '#800000', '#008000']
                                    .map((c) => (
                                        <button
                                            key={c}
                                            className="w-8 h-8 rounded border"
                                            style={{ backgroundColor: c }}
                                            onClick={() => setColor(c)}
                                        />
                                    ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="w-32">
                        <Slider
                            min={1}
                            max={20}
                            step={1}
                            value={[strokeWidth]}
                            onValueChange={([value]) => setStrokeWidth(value)}
                        />
                    </div>
                </div>

                <div className="flex gap-1 border-r pr-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={undo}
                        className="w-8 h-8"
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={redo}
                        className="w-8 h-8"
                    >
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleZoom(true)}
                        className="w-8 h-8"
                    >
                        +
                    </Button>
                    <span className="flex items-center min-w-[3rem] justify-center">
                        {(zoom * 100).toFixed(0)}%
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleZoom(false)}
                        className="w-8 h-8"
                    >
                        -
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearCanvas}
                    className="w-8 h-8 text-red-500"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};