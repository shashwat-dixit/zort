"use client"
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';

const RoomEntry = () => {
    const [username, setUsername] = useState('');
    const [roomIdInput, setRoomIdInput] = useState('');
    const setUser = useStore(state => state.setUser);
    const setRoomId = useStore(state => state.setRoomId);
    const router = useRouter();

    const handleJoinRoom = () => {
        if (!username || !roomIdInput) return;

        const user = {
            id: Math.random().toString(36).substr(2, 9),
            name: username,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        };

        setUser(user);
        setRoomId(roomIdInput);
        router.push(`/room/${roomIdInput}`);
    };

    return (
        <div className="mt-20 w-screen flex items-center justify-center">
            <Card className="w-96">
                <CardHeader>
                    <CardTitle>Join Whiteboard Room</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Input
                                placeholder="Your name"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <Input
                                placeholder="Room ID"
                                value={roomIdInput}
                                onChange={(e) => setRoomIdInput(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleJoinRoom}
                            disabled={!username || !roomIdInput}
                        >
                            Join Room
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RoomEntry;