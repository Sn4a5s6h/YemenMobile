import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static('public'));

let broadcasterSocket = null;

io.on('connection', socket => {
  console.log('📡 مستخدم متصل:', socket.id);

  // المذيع يدخل دائمًا غرفة 3461
  socket.on('broadcaster', () => {
    broadcasterSocket = socket;
    console.log('🎥 Broadcaster بدأ البث في الغرفة 3461');
  });

  // مشاهد جديد
  socket.on('watcher', ({ watcherId }) => {
    if (broadcasterSocket) {
      broadcasterSocket.emit('watcher', { watcherId });
    } else {
      socket.emit('no-broadcaster', {});
    }
  });

  // عرض (من المذيع → للمشاهد)
  socket.on('offer', ({ watcherId, sdp }) => {
    io.to(watcherId).emit('offer', { from: socket.id, sdp });
  });

  // رد (من المشاهد → للمذيع)
  socket.on('answer', ({ from, sdp }) => {
    if (broadcasterSocket) {
      broadcasterSocket.emit('answer', { from, sdp });
    }
  });

  // مرشحات ICE
  socket.on('candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('candidate', { from: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    console.log('❌ مستخدم خرج:', socket.id);
    if (socket === broadcasterSocket) {
      io.emit('broadcaster-left', {});
      broadcasterSocket = null;
      console.log('⚠️ المذيع خرج من البث');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ الخادم يعمل على http://localhost:${PORT}`));
