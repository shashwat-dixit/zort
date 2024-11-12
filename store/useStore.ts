// types/index.ts
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { produce } from "immer";
import { Element, Point, ElementType, User } from "@/types";

interface HistoryState {
  past: Element[][];
  future: Element[][];
}

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
  history: { past: [], future: [] } as HistoryState,
  isEditingText: false,
};

export const useStore = create(
  combine(initialState, (set, get) => ({
    setElements: (elements: Element[]) => {
      const { history } = get();
      set(
        produce((state: typeof initialState) => {
          state.elements = elements;
          state.history.past.push([...state.elements]);
          state.history.future = [];
        })
      );
    },

    setUser: (user: User | null) =>
      set(
        produce((state: typeof initialState) => {
          state.user = user;
        })
      ),

    setRoomId: (roomId: string) =>
      set(
        produce((state: typeof initialState) => {
          state.roomId = roomId;
        })
      ),

    setUsers: (users: User[]) =>
      set(
        produce((state: typeof initialState) => {
          state.users = users;
        })
      ),

    addElement: (element: Element) => {
      set(
        produce((state: typeof initialState) => {
          state.elements.push(element);
          state.history.past.push([...state.elements]);
          state.history.future = [];
        })
      );
    },

    updateElement: (id: string, changes: Partial<Element>) => {
      set(
        produce((state: typeof initialState) => {
          const index = state.elements.findIndex((el) => el.id === id);
          if (index !== -1) {
            state.elements[index] = { ...state.elements[index], ...changes };
          }
          state.history.past.push([...state.elements]);
          state.history.future = [];
        })
      );
    },

    deleteElement: (id: string) => {
      set(
        produce((state: typeof initialState) => {
          state.elements = state.elements.filter((el) => el.id !== id);
          state.history.past.push([...state.elements]);
          state.history.future = [];
        })
      );
    },

    clearCanvas: () => {
      set(
        produce((state: typeof initialState) => {
          state.history.past.push([...state.elements]);
          state.elements = [];
          state.history.future = [];
        })
      );
    },

    undo: () => {
      set(
        produce((state: typeof initialState) => {
          if (state.history.past.length > 0) {
            const previous = state.history.past.pop()!;
            state.history.future.push([...state.elements]);
            state.elements = previous;
          }
        })
      );
    },

    redo: () => {
      set(
        produce((state: typeof initialState) => {
          if (state.history.future.length > 0) {
            const next = state.history.future.pop()!;
            state.history.past.push([...state.elements]);
            state.elements = next;
          }
        })
      );
    },

    setSelectedElement: (element: Element | null) =>
      set({ selectedElement: element }),
    setTool: (tool: ElementType) => set({ tool }),
    setColor: (color: string) => set({ color }),
    setStrokeWidth: (width: number) => set({ strokeWidth: width }),
    setZoom: (zoom: number) => set({ zoom }),
    setOffset: (offset: Point) => set({ offset }),
    setIsEditingText: (isEditingText: boolean) => set({ isEditingText }),

    getTransformedPoint: (point: Point) => {
      const { zoom, offset } = get();
      return {
        x: (point.x - offset.x) / zoom,
        y: (point.y - offset.y) / zoom,
      };
    },
  }))
);
