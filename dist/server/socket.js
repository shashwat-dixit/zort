// server/socket.ts
import { Server } from "socket.io";
export function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    const rooms = new Map();
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);
        socket.on("join-room", ({ roomId, user }) => {
            socket.join(roomId);
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId)?.add(socket.id);
            // Broadcast to others in room that new user joined
            socket.to(roomId).emit("user-joined", user);
            // Send current users to the new joiner
            const roomUsers = Array.from(rooms.get(roomId) || []);
            socket.emit("room-users", roomUsers);
        });
        socket.on("element-update", ({ roomId, element }) => {
            socket.to(roomId).emit("element-updated", element);
        });
        socket.on("add-element", ({ roomId, element }) => {
            socket.to(roomId).emit("element-added", element);
        });
        socket.on("disconnect", () => {
            // Remove user from all rooms they were in
            rooms.forEach((users, roomId) => {
                if (users.has(socket.id)) {
                    users.delete(socket.id);
                    io.to(roomId).emit("user-left", socket.id);
                }
            });
        });
    });
    return io;
}