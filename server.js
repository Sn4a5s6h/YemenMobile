import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import geoip from 'geoip-lite';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static('public'));

let broadcaster = null;
let pendingViewers = new Map();  // socketId -> info
let authorizedViewers = new Map(); // socketId -> info

// عند اتصال أي مستخدم
io.on('connection', socket => {
  console.log('مستخدم متصل:', socket.id);

  socket.on('broadcaster', () => {
    broadcaster = socket;
    console.log('Broadcaster is online');
  });

  socket.on('request_join', info => {
    // إضافة المشاهد للقائمة المعلقة
    pendingViewers.set(socket.id, { ...info, id: socket.id });
    io.to('admin').emit('pending_list', Array.from(pendingViewers.values()));
  });

  socket.on('admin_join', () => {
    socket.join('admin'); // صفحة التحكم
    // إرسال القوائم الحالية
    socket.emit('pending_list', Array.from(pendingViewers.values()));
    socket.emit('authorized_list', Array.from(authorizedViewers.values()));
  });

  socket.on('approve', viewerId => {
    if(pendingViewers.has(viewerId)) {
      const info = pendingViewers.get(viewerId);
      pendingViewers.delete(viewerId);
      authorizedViewers.set(viewerId, info);
      io.to(viewerId).emit('approved');
      io.to('admin').emit('pending_list', Array.from(pendingViewers.values()));
      io.to('admin').emit('authorized_list', Array.from(authorizedViewers.values()));
    }
  });

  socket.on('reject', viewerId => {
    pendingViewers.delete(viewerId);
    io.to(viewerId).emit('rejected');
    io.to('admin').emit('pending_list', Array.from(pendingViewers.values()));
  });

  socket.on('offer', ({ to, sdp }) => {
    io.to(to).emit('offer', { from: socket.id, sdp });
  });

  socket.on('answer', ({ to, sdp }) => {
    io.to(to).emit('answer', { from: socket.id, sdp });
  });

  socket.on('candidate', ({ to, candidate }) => {
    io.to(to).emit('candidate', { from: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    console.log('مستخدم خرج:', socket.id);
    pendingViewers.delete(socket.id);
    authorizedViewers.delete(socket.id);
    if(socket === broadcaster){
      broadcaster = null;
      io.emit('broadcaster_left');
    }
    io.to('admin').emit('pending_list', Array.from(pendingViewers.values()));
    io.to('admin').emit('authorized_list', Array.from(authorizedViewers.values()));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
