import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"


import {
  Button
} from "@/components/ui/button"
import CanvasWithGrid from "@/components/canvas/canvasWithGrid";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-5xl">Zort</h1>
      <h2>A collaborative whiteboard!</h2>
      {/* Add the form => 1. Allow people to make new rooms or 2. Allow people to join the rooms. */}
    </div>
  );
}
