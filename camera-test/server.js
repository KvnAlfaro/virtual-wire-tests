const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
require('dotenv').config({ path: '../.env' });

const options = {
  key: fs.readFileSync('cert/test-key.pem'),
  cert: fs.readFileSync('cert/test-cert.pem')
};

const app = express();
const server = https.createServer(options, app);
const io = socketIo(server);
const PORT = process.env.CAMERA_TEST_PORT || 3000;

app.use(express.static('public'));

let currentBroadcaster = null;

io.on('connection', socket => {
  socket.on('request-broadcast', () => {
    if (!currentBroadcaster) {
      currentBroadcaster = socket.id;
      socket.emit('broadcast-accepted');
    } else {
      socket.emit('broadcast-denied');
    }
  });

  socket.on('stop-broadcast', () => {
  if (socket.id === currentBroadcaster) {
    currentBroadcaster = null;

    socket.broadcast.emit('peer-disconnected', socket.id);
  }
});

  socket.on('signal', data => {
    io.to(data.to).emit('signal', { from: data.from, signal: data.signal });
  });

  socket.on('ready', () => {
    socket.broadcast.emit('ready', socket.id);
  });

  socket.on('disconnect', () => {
    if (socket.id === currentBroadcaster) {
      currentBroadcaster = null;
    }
    socket.broadcast.emit('peer-disconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at https://localhost:${PORT}`);
});