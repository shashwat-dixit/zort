export type Point = {
  x: number;
  y: number;
};

export type ElementType = "rectangle" | "circle" | "line" | "pencil" | "text";

export interface Element {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Point[]; // For pencil tool
  text?: string; // For text tool
  color: string;
  strokeWidth: number;
  isSelected?: boolean;
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
