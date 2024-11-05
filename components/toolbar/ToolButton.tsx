import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ElementType } from '@/types';

interface ToolButtonProps {
    tool: ElementType;
    activeTool: ElementType;
    onClick: (tool: ElementType) => void;
    icon: React.ReactNode;
}

export const ToolButton = ({ tool, activeTool, onClick, icon }: ToolButtonProps) => (
    <Button
        variant="ghost"
        size="icon"
        className={cn(
            'w-10 h-10',
            tool === activeTool && 'bg-accent text-accent-foreground'
        )}
        onClick={() => onClick(tool)}
    >
        {icon}
    </Button>
);