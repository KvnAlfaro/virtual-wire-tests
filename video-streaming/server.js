const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.VIDEO_STREAMING_PORT || 3000;

const hlsDir = path.join(__dirname, 'public', 'hls');
if (!fs.existsSync(hlsDir)) {
  fs.mkdirSync(hlsDir, { recursive: true });
}

const ffmpeg = spawn('ffmpeg', [
  '-stream_loop', '-1',
  '-re',
  '-i', 'public/sample.mp4',
  '-preset', 'veryfast',
  '-g', '48',
  '-sc_threshold', '0',
  '-map', '0:v',
  '-c:v', 'libx264',
  '-b:v', '8000k',
  '-f', 'hls',
  '-hls_time', '4',
  '-hls_list_size', '6',
  '-hls_flags', 'delete_segments+append_list',
  '-loglevel', 'quiet',  
  'public/hls/stream.m3u8'
]);

ffmpeg.stderr.on('data', data => {
  console.error(`[ffmpeg] ${data}`);
});

ffmpeg.on('error', err => {
  console.error('Failed to start FFmpeg:', err);
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});