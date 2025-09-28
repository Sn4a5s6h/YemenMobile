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
let viewers = new Map(); // watcherId -> info

// Socket.io events
io.on('connection', socket => {
  console.log('متصل:', socket.id);

  socket.on('broadcaster', () => {
    broadcaster = socket;
    console.log('المذيع متصل:', socket.id);
  });

  socket.on('watcher', async () => {
    if (!broadcaster) {
      socket.emit('no-broadcaster');
      return;
    }

    // احصل على بيانات المشاهد
    const ip = socket.handshake.address;
    const geo = geoip.lookup(ip);
    const device = socket.handshake.headers['user-agent'];

    viewers.set(socket.id, { ip, geo, device });
    // أرسل طلب موافقة للمذيع
    broadcaster.emit('approve-request', { watcherId: socket.id, ip, geo, device });
  });

  socket.on('approve-watcher', ({ watcherId }) => {
    socket.to(watcherId).emit('approved');
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
    console.log('انفصال:', socket.id);
    viewers.delete(socket.id);
    if (socket === broadcaster) {
      broadcaster = null;
      io.emit('broadcaster-left');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ الخادم يعمل على http://localhost:${PORT}`)); 
