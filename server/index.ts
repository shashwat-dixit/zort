import express from "express";
import { createServer } from "http";
import { initSocket } from "./socket.js";
import cors from "cors";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = initSocket(httpServer);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
