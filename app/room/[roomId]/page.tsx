import { Whiteboard } from '@/components/Whiteboard'

export default function RoomPage({ params }: { params: { roomId: string } }) {
    return <Whiteboard roomId={params.roomId} />;
}