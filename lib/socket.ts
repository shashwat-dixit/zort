// lib/socket.ts
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin
  : 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  path: "/socket.io/",
  transports: ["polling", "websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
});

socket.on("connect", () => {
  console.log("Socket connected!");
});

// Add the joinRoom function export
export const joinRoom = (roomId: string, user: { id: string; name: string; color: string }) => {
  socket.emit('join-room', { roomId, user });
};