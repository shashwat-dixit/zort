import RoomEntry from "@/components/RoomEntry";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-5xl">Zort</h1>
      <h2 className="mt-5">A collaborative whiteboard!</h2>
      <RoomEntry />
    </div>
  );
}
