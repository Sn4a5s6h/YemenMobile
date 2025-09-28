import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ملفات ثابتة
app.use(express.static("public"));

// المذيع الحالي
let broadcasterSocket = null;

// اتصالات Socket.io
io.on("connection", socket => {
  console.log("مستخدم متصل:", socket.id);

  // المذيع يبدأ البث
  socket.on("broadcaster", () => {
    broadcasterSocket = socket;
    console.log("🔴 Broadcaster متصل:", socket.id);
  });

  // مشاهد ينضم للبث
  socket.on("watcher", data => {
    if (broadcasterSocket) {
      broadcasterSocket.emit("watcher", { watcherId: socket.id, info: data });
    } else {
      socket.emit("no-broadcaster");
    }
  });

  // عرض (offer) من المذيع
  socket.on("offer", ({ watcherId, sdp }) => {
    io.to(watcherId).emit("offer", { from: socket.id, sdp });
  });

  // جواب (answer) من المشاهد
  socket.on("answer", ({ targetId, sdp }) => {
    io.to(targetId).emit("answer", { from: socket.id, sdp });
  });

  // إرسال ICE candidates
  socket.on("candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("candidate", { from: socket.id, candidate });
  });

  // تسجيل أحداث الماوس والكيبورد
  socket.on("key-press", data => socket.broadcast.emit("key-press", data));
  socket.on("mouse-click", data => socket.broadcast.emit("mouse-click", data));
  socket.on("mouse-move", data => socket.broadcast.emit("mouse-move", data));

  // المستخدم يغادر
  socket.on("disconnect", () => {
    console.log("مستخدم خرج:", socket.id);
    if (socket === broadcasterSocket) {
      io.emit("broadcaster-left");
      broadcasterSocket = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ الخادم يعمل على http://localhost:${PORT}`));
