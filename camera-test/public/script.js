const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const message = document.getElementById('statusMessage');

let localStream;
let peerConnections = {};
let isBroadcaster = false;

document.getElementById('startBtn').onclick = () => {
    socket.emit('request-broadcast');
    document.getElementById('menu').style.display = 'none';
};

document.getElementById('viewBtn').onclick = () => {
    socket.emit('ready');
    document.getElementById('menu').style.display = 'none';
};

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function selectRole(role) {
  if (role === 'broadcast') {
    socket.emit('request-broadcast');
  } else {
    socket.emit('ready');
  }
}

function stopBroadcast() {
  if (!isBroadcaster) return;

  localStream.getTracks().forEach(track => track.stop());
  localVideo.srcObject = null;
  localVideo.style.display = 'none';

  socket.emit('stop-broadcast');

  isBroadcaster = false;
  document.getElementById('stopBroadcastBtn').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';
  showToast('Broadcast stopped.');
}

socket.on('broadcast-accepted', () => {
  isBroadcaster = true;
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      localStream = stream;
      localVideo.srcObject = stream;
      localVideo.style.display = 'block';
      document.getElementById('stopBroadcastBtn').style.display = 'inline-block';
      socket.emit('ready');
    })
    .catch(err => {
      console.error('Camera error:', err);
      message.textContent = 'Camera access failed.';
    });
});

socket.on('broadcast-denied', () => {
    document.getElementById('menu').style.display = 'flex';
    showToast('Broadcasting not allowed, someone is already streaming.');
});

socket.on('ready', peerId => {
  if (!isBroadcaster || peerConnections[peerId]) return;

  const pc = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('signal', { to: peerId, from: socket.id, signal: { candidate: event.candidate } });
    }
  };

  pc.createOffer()
    .then(offer => pc.setLocalDescription(offer))
    .then(() => {
      socket.emit('signal', { to: peerId, from: socket.id, signal: pc.localDescription });
    });

  peerConnections[peerId] = pc;
});

socket.on('signal', async data => {
  const fromId = data.from;
  const signal = data.signal;

  if (!peerConnections[fromId]) {
    const pc = new RTCPeerConnection(config);

    pc.ontrack = event => {
      remoteVideo.srcObject = event.streams[0];
      remoteVideo.style.display = 'block';
      localVideo.style.display = 'none';
    };

    pc.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('signal', { to: fromId, from: socket.id, signal: { candidate: event.candidate } });
      }
    };

    peerConnections[fromId] = pc;
  }

  const pc = peerConnections[fromId];

  if (signal.sdp) {
    await pc.setRemoteDescription(new RTCSessionDescription(signal));
    if (signal.type === 'offer') {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('signal', { to: fromId, from: socket.id, signal: pc.localDescription });
    }
  } else if (signal.candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }
});

socket.on('peer-disconnected', peerId => {
  if (peerConnections[peerId]) {
    peerConnections[peerId].close();
    delete peerConnections[peerId];
  }
});