import { create } from "zustand";
import { combine } from "zustand/middleware";
import { ElementType, User, Point } from "@/types/index";

const initialState = {
  elements: [] as Element[],
  selectedElement: null as Element | null,
  tool: "pencil" as ElementType,
  color: "#000000",
  strokeWidth: 2,
  roomId: "",
  user: null as User | null,
  users: [] as User[],
  zoom: 1,
  offset: { x: 0, y: 0 },
};

export const useStore = create(
  combine(initialState, (set, get) => ({
    setElements: (elements: Element[]) => set({ elements }),
    addElement: (element: Element) =>
      set((state) => ({
        elements: [...state.elements, element],
      })),
    updateElement: (id: string, changes: Partial<Element>) =>
      set((state) => ({
        elements: state.elements.map((el) =>
          el.id === id ? { ...el, ...changes } : el
        ),
      })),
    setSelectedElement: (element: Element | null) =>
      set({ selectedElement: element }),
    setTool: (tool: ElementType) => set({ tool }),
    setColor: (color: string) => set({ color }),
    setStrokeWidth: (width: number) => set({ strokeWidth: width }),
    setRoomId: (roomId: string) => set({ roomId }),
    setUser: (user: User | null) => set({ user }),
    setUsers: (users: User[]) => set({ users }),
    setZoom: (zoom: number) => set({ zoom }),
    setOffset: (offset: Point) => set({ offset }),
    // Helper function to get transformed point based on zoom and offset
    getTransformedPoint: (point: Point) => {
      const { zoom, offset } = get();
      return {
        x: (point.x - offset.x) / zoom,
        y: (point.y - offset.y) / zoom,
      };
    },
  }))
);
