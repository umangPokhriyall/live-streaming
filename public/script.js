const userVideo = document.getElementById("user-video");
const streamVideo = document.getElementById("stream-video");
const startButton = document.getElementById("start-button");
const streamFormatSelect = document.getElementById("stream-format");
const changeFormatButton = document.getElementById("change-format");

const state = {
  mediaStream: null,
  isStreaming: false,
  flvPlayer: null,
  hlsPlayer: null,
  dashPlayer: null,
  currentFormat: "flv",
};

const socket = io();

// Clean up existing players
function cleanupPlayers() {
  if (state.flvPlayer) {
    state.flvPlayer.pause();
    state.flvPlayer.unload();
    state.flvPlayer.detachMediaElement();
    state.flvPlayer.destroy();
    state.flvPlayer = null;
  }

  if (state.hlsPlayer) {
    state.hlsPlayer.destroy();
    state.hlsPlayer = null;
  }

  if (state.dashPlayer) {
    state.dashPlayer.destroy();
    state.dashPlayer = null;
  }

  streamVideo.src = "";
  streamVideo.removeAttribute("src");
}

// Initialize player based on selected format
function initializeStreamPlayer(format = "flv") {
  cleanupPlayers();
  state.currentFormat = format;

  switch (format) {
    case "flv":
      initializeFLVPlayer();
      break;
    case "hls":
      initializeHLSPlayer();
      break;
    case "dash":
      initializeDASHPlayer();
      break;
    default:
      initializeFLVPlayer();
  }
}

// Initialize FLV player
function initializeFLVPlayer() {
  if (flvjs.isSupported()) {
    const flvPlayer = flvjs.createPlayer({
      type: "flv",
      url: getStreamUrl("flv"),
    });
    flvPlayer.attachMediaElement(streamVideo);
    flvPlayer.load();
    flvPlayer.play();
    state.flvPlayer = flvPlayer;
    console.log("FLV player initialized");
  } else {
    console.warn("FLV.js is not supported in your browser");
    // Fallback to HLS
    initializeHLSPlayer();
  }
}

// Initialize HLS player
function initializeHLSPlayer() {
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(getStreamUrl("hls"));
    hls.attachMedia(streamVideo);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      streamVideo.play();
    });
    state.hlsPlayer = hls;
    console.log("HLS player initialized");
  } else if (streamVideo.canPlayType("application/vnd.apple.mpegurl")) {
    // Native HLS support in Safari
    streamVideo.src = getStreamUrl("hls");
    streamVideo.play();
    console.log("Native HLS player initialized");
  } else {
    console.warn("HLS is not supported in your browser, trying DASH...");
    initializeDASHPlayer();
  }
}

// Initialize DASH player
function initializeDASHPlayer() {
  const dashPlayer = dashjs.MediaPlayer().create();
  dashPlayer.initialize(streamVideo, getStreamUrl("dash"), true);
  state.dashPlayer = dashPlayer;
  console.log("DASH player initialized");
}

// Stream selection options
function getStreamUrl(type) {
  const baseUrl = "http://localhost:8000/live/stream";
  switch (type) {
    case "flv":
      return `${baseUrl}.flv`;
    case "hls":
      return `${baseUrl}/index.m3u8`;
    case "dash":
      return `${baseUrl}/index.mpd`;
    default:
      return `${baseUrl}.flv`;
  }
}

// Format change button handler
changeFormatButton.addEventListener("click", () => {
  const format = streamFormatSelect.value;
  initializeStreamPlayer(format);
});

// Start/stop streaming button handler
startButton.addEventListener("click", () => {
  if (state.isStreaming) {
    startButton.textContent = "Start Streaming";
    state.isStreaming = false;
    cleanupPlayers();
    return;
  }

  const mediaRecorder = new MediaRecorder(state.mediaStream, {
    audioBitsPerSecond: 128000,
    videoBitsPerSecond: 2500000,
    frameRate: 25,
  });

  mediaRecorder.ondataavailable = (e) => {
    console.log("dataavailable", e.data);
    socket.emit("binary-data", e.data);
  };

  mediaRecorder.start(25);
  startButton.textContent = "Stop Streaming";
  state.isStreaming = true;

  // Initialize the stream player if not already playing
  setTimeout(() => {
    initializeStreamPlayer(state.currentFormat);
  }, 2000); // Give the stream some time to start
});

window.addEventListener("load", async (e) => {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    state.mediaStream = mediaStream;
    userVideo.srcObject = mediaStream;
  } catch (err) {
    console.error("Error accessing media devices:", err);
    alert("Could not access camera or microphone. Please check permissions.");
  }
});
