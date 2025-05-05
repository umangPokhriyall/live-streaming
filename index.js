import http from "http";
import path from "path";
import express from "express";
import { spawn } from "child_process";
import { Server as SocketIo } from "socket.io";
import NodeMediaServer from "node-media-server";

const app = express();
const server = http.createServer(app);
const io = new SocketIo(server);

// Configure Node-Media-Server
const nmsConfig = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8000,
    allow_origin: "*",
    mediaroot: "./media", // Media files directory
  },
  trans: {
    ffmpeg: "/usr/bin/ffmpeg",
    tasks: [
      {
        app: "live",
        hls: true,
        hlsFlags: "[hls_time=2:hls_list_size=3:hls_flags=delete_segments]",
      },
    ],
  },
  fission: {
    ffmpeg: "/usr/bin/ffmpeg",
    tasks: [
      {
        rule: "live/stream",
        model: [
          {
            ab: "128k", // Audio bitrate
            vb: "1500k", // Video bitrate
            vs: "1280x720", // Resolution
            vf: "30", // Framerate
          },
          {
            ab: "96k",
            vb: "1000k",
            vs: "854x480",
            vf: "24",
          },
          {
            ab: "64k",
            vb: "600k",
            vs: "640x360",
            vf: "20",
          },
        ],
      },
    ],
  },
};

// Start the media server
const nms = new NodeMediaServer(nmsConfig);
nms.run();

// FFmpeg options to stream to local RTMP server
const options = [
  "-i",
  "-",
  "-c:v",
  "libx264",
  "-preset",
  "ultrafast",
  "-tune",
  "zerolatency",
  "-r",
  `${25}`,
  "-g",
  `${25 * 2}`,
  "-keyint_min",
  25,
  "-crf",
  "25",
  "-pix_fmt",
  "yuv420p",
  "-sc_threshold",
  "0",
  "-profile:v",
  "main",
  "-level",
  "3.1",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-ar",
  128000 / 4,
  "-f",
  "flv",
  `rtmp://localhost:1935/live/stream`,
];

const ffmpegProcess = spawn("ffmpeg", options);

ffmpegProcess.stdout.on("data", (data) => {
  console.log(`ffmpeg stdout: ${data}`);
});

ffmpegProcess.stderr.on("data", (data) => {
  console.error(`ffmpeg stderr: ${data}`);
});

ffmpegProcess.on("close", (code) => {
  console.log(`ffmpeg process exited with code ${code}`);
});

app.use(express.static(path.resolve("./public")));

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("binary-data", (data) => {
    // console.log("binary-data");
    ffmpegProcess.stdin.write(data, (err) => {
      if (err) {
        console.error("Error writing to ffmpeg", err);
      }
    });
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
  console.log("RTMP server running on rtmp://localhost:1935");
  console.log("Multi-resolution HLS streams available at:");
  console.log(
    "- High quality (720p): http://localhost:8000/live/stream_720/index.m3u8"
  );
  console.log(
    "- Medium quality (480p): http://localhost:8000/live/stream_480/index.m3u8"
  );
  console.log(
    "- Low quality (360p): http://localhost:8000/live/stream_360/index.m3u8"
  );
});
