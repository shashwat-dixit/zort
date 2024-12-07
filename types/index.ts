export type Point = {
  x: number;
  y: number;
};

export type DrawingTools = "rectangle" | "circle" | "text" | "pencil";
export type UtilityTools = "select" | "eraser";
export type ElementType = DrawingTools | UtilityTools;

export interface Element {
  id: string;
  type: DrawingTools; // Note: Elements can only be drawing tools, not utility tools
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Point[];
  text?: string;
  color: string;
  strokeWidth: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
}
export interface RoomData {
  elements: Element[];
  users: User[];
}
