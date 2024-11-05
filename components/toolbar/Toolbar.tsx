import { Square, Circle, Type, Pencil, MousePointer } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ToolButton } from './ToolButton';
import { ElementType } from '@/types';

export const Toolbar = () => {
    const tool = useStore(state => state.tool);
    const setTool = useStore(state => state.setTool);

    const tools = [
        { type: 'select' as ElementType, icon: <MousePointer className="h-4 w-4" /> },
        { type: 'rectangle' as ElementType, icon: <Square className="h-4 w-4" /> },
        { type: 'circle' as ElementType, icon: <Circle className="h-4 w-4" /> },
        { type: 'text' as ElementType, icon: <Type className="h-4 w-4" /> },
        { type: 'pencil' as ElementType, icon: <Pencil className="h-4 w-4" /> },
    ];

    return (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-2 flex gap-1">
            {tools.map((t) => (
                <ToolButton
                    key={t.type}
                    tool={t.type}
                    activeTool={tool}
                    onClick={setTool}
                    icon={t.icon}
                />
            ))}
        </div>
    );
};