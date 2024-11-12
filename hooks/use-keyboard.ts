import { useEffect } from "react";
import { useStore } from "@/store/useStore";

export const useKeyboardShortcuts = () => {
  const { undo, redo, setTool, deleteElement, selectedElement } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }

      // Delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElement) {
          e.preventDefault();
          deleteElement(selectedElement.id);
        }
      }

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "r":
          setTool("rectangle");
          break;
        case "c":
          setTool("circle");
          break;
        case "t":
          setTool("text");
          break;
        case "p":
          setTool("pencil");
          break;
        case "e":
          setTool("eraser");
          break;
        case " ":
          // Temporary switch to pan tool while space is held
          e.preventDefault();
          setTool("select");
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setTool("pencil"); // Or whatever the previous tool was
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedElement]);
};
