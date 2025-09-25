require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// rooms storage (in-memory)
const rooms = {}; // { roomId: { name, passwordHash?, users: { socketId: { username, publicKey } } } }

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('create-room', async ({ roomName, passphrase, username, publicKey }, ack) => {
    try {
      const roomId = uuidv4();
      let passwordHash = null;
      if (passphrase) {
        passwordHash = await bcrypt.hash(passphrase, 10);
      }
      rooms[roomId] = { name: roomName || roomId, passwordHash, users: {} };
      // add user to room
      rooms[roomId].users[socket.id] = { username, publicKey };
      socket.join(roomId);
      ack && ack({ ok: true, roomId });
      io.to(roomId).emit('room-data', { roomId, users: rooms[roomId].users });
    } catch (e) {
      console.error(e);
      ack && ack({ ok: false, error: e.message });
    }
  });

  socket.on('join-room', async ({ roomId, passphrase, username, publicKey }, ack) => {
    try {
      const room = rooms[roomId];
      if (!room) return ack && ack({ ok: false, error: 'Room não existe' });
      if (room.passwordHash) {
        const okPass = await bcrypt.compare(passphrase || '', room.passwordHash);
        if (!okPass) return ack && ack({ ok: false, error: 'Senha incorreta' });
      }
      room.users[socket.id] = { username, publicKey };
      socket.join(roomId);
      ack && ack({ ok: true, roomId });
      io.to(roomId).emit('room-data', { roomId, users: room.users });
    } catch (e) {
      console.error(e);
      ack && ack({ ok: false, error: e.message });
    }
  });

  socket.on('send-encrypted', ({ roomId, messages }) => {
    // messages: [{ toSocketId, ciphertext, nonce, senderPublicKey }]
    const room = rooms[roomId];
    if (!room) return;
    messages.forEach((m) => {
      const target = m.toSocketId;
      if (room.users[target]) {
        io.to(target).emit('encrypted-message', {
          fromSocketId: socket.id,
          fromUsername: room.users[socket.id]?.username,
          ciphertext: m.ciphertext,
          nonce: m.nonce,
          senderPublicKey: m.senderPublicKey
        });
      }
    });
  });

  socket.on('leave-room', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.users[socket.id]) {
      delete room.users[socket.id];
      socket.leave(roomId);
      io.to(roomId).emit('room-data', { roomId, users: room.users });
      if (Object.keys(room.users).length === 0 && !room.persistent) {
        delete rooms[roomId];
      }
    }
  });

  socket.on('disconnect', () => {
    // remove user from all rooms
    for (const roomId of Object.keys(rooms)) {
      const room = rooms[roomId];
      if (room.users[socket.id]) {
        delete room.users[socket.id];
        io.to(roomId).emit('room-data', { roomId, users: room.users });
        if (Object.keys(room.users).length === 0 && !room.persistent) {
          delete rooms[roomId];
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
