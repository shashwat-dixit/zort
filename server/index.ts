// server/index.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import type { User, Element } from "../types";

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/socket.io/", // Make sure this matches the client path
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["polling", "websocket"],
  allowEIO3: true
});

const rooms = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", ({ roomId, user }: { roomId: string; user: User }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId)?.add(socket.id);
    socket.to(roomId).emit("user-joined", user);
    const roomUsers = Array.from(rooms.get(roomId) || []);
    socket.emit("room-users", roomUsers);
  });

  // Your existing socket event handlers...
});

// Add a basic health check route
app.get("/health", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "production") {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default httpServer;