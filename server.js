import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static('public'));

// خادم Socket.io بسيط لبث الفيديو
let broadcasterSocket = null;

io.on('connection', socket => {
  console.log('مستخدم متصل:', socket.id);

  socket.on('broadcaster', roomID => {
    broadcasterSocket = socket;
    console.log('Broadcaster started in room:', roomID);
  });

  socket.on('watcher', watcherId => {
    if (broadcasterSocket) {
      broadcasterSocket.emit('watcher', { watcherId });
    } else {
      socket.emit('no-broadcaster', {});
    }
  });

  socket.on('offer', ({ watcherId, sdp }) => {
    io.to(watcherId).emit('offer', { from: socket.id, sdp });
  });

  socket.on('answer', ({ from, sdp }) => {
    io.to(from).emit('answer', { from: socket.id, sdp });
  });

  socket.on('candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('candidate', { from: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    console.log('مستخدم خرج:', socket.id);
    if (socket === broadcasterSocket) {
      io.emit('broadcaster-left', {});
      broadcasterSocket = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ الخادم يعمل على http://localhost:${PORT}`));
