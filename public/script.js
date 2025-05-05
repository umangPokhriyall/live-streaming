const userVideo = document.getElementById("user-video");
const streamVideo = document.getElementById("stream-video");
const startButton = document.getElementById("start-button");
const qualitySelector = document.getElementById("quality-selector");
const streamStatus = document.getElementById("stream-status");

const state = {
  mediaStream: null,
  isStreaming: false,
  hlsPlayer: null,
  currentQuality: -1, // -1 for auto
};

const socket = io();

// Update stream status display
function updateStreamStatus(message) {
  streamStatus.textContent = message;
}

// Clean up existing player
function cleanupPlayer() {
  if (state.hlsPlayer) {
    state.hlsPlayer.destroy();
    state.hlsPlayer = null;
  }

  streamVideo.src = "";
  streamVideo.removeAttribute("src");
}

// Initialize HLS player
function initializeHLSPlayer() {
  cleanupPlayer();

  if (Hls.isSupported()) {
    const hls = new Hls({
      // Enable adaptive bitrate switching between our resolutions
      autoStartLoad: true,
      startLevel: state.currentQuality, // Use selected quality or auto (-1)
      debug: false,
      capLevelToPlayerSize: true, // Automatically select resolution based on player size
    });

    // Create master playlist that includes all quality levels
    // Using absolute URLs instead of relative paths to fix loading issues
    const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1628000,RESOLUTION=1280x720,FRAME-RATE=30,CODECS="avc1.4d401f,mp4a.40.2"
http://localhost:8000/live/stream_720/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1096000,RESOLUTION=854x480,FRAME-RATE=24,CODECS="avc1.4d401f,mp4a.40.2"
http://localhost:8000/live/stream_480/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=664000,RESOLUTION=640x360,FRAME-RATE=20,CODECS="avc1.4d401f,mp4a.40.2"
http://localhost:8000/live/stream_360/index.m3u8`;

    console.log("Master playlist created with the following streams:");
    console.log("- http://localhost:8000/live/stream_720/index.m3u8");
    console.log("- http://localhost:8000/live/stream_480/index.m3u8");
    console.log("- http://localhost:8000/live/stream_360/index.m3u8");

    // Create a blob URL for the master playlist
    const masterBlob = new Blob([masterPlaylist], {
      type: "application/vnd.apple.mpegurl",
    });
    const masterUrl = URL.createObjectURL(masterBlob);
    console.log("Master playlist URL:", masterUrl);

    // Load the master playlist instead of a single quality level
    hls.loadSource(masterUrl);
    hls.attachMedia(streamVideo);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log("HLS manifest parsed successfully");
      console.log(
        "Available quality levels:",
        hls.levels.map((level) => ({
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          url: level.url,
        }))
      );
      streamVideo.play();
    });

    // Add quality level selection event handler
    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      const quality = hls.levels[data.level].height;
      const url = hls.levels[data.level].url;
      console.log(`Switched to quality level: ${quality}p`);
      console.log(`Loading stream from: ${url}`);
      updateStreamStatus(`Playing HLS stream (${quality}p)`);
    });

    // Track fragment loading
    hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
      console.log(`Loading fragment: ${data.frag.url}`);
    });

    // Track errors
    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error("HLS Error:", data.type, data.details, data);
      if (data.fatal) {
        console.error("Fatal error encountered");
      }
    });

    state.hlsPlayer = hls;
    console.log("HLS player initialized with adaptive bitrate");
    updateStreamStatus("Playing HLS stream with adaptive quality");
  } else if (streamVideo.canPlayType("application/vnd.apple.mpegurl")) {
    // Native HLS support in Safari
    const url = "http://localhost:8000/live/stream.m3u8";
    console.log(`Using native HLS player with URL: ${url}`);
    streamVideo.src = url;
    streamVideo.play();
    console.log("Native HLS player initialized");
    updateStreamStatus("Playing HLS stream (native player)");
  } else {
    console.error("HLS is not supported in your browser");
    updateStreamStatus("Error: Your browser doesn't support HLS streaming");
  }
}

// Quality selector handler
qualitySelector.addEventListener("change", () => {
  const selectedQuality = parseInt(qualitySelector.value);
  state.currentQuality = selectedQuality;

  if (state.hlsPlayer) {
    // Apply quality change to the player
    state.hlsPlayer.currentLevel = selectedQuality;

    const qualityName =
      selectedQuality === -1
        ? "Auto"
        : `${state.hlsPlayer.levels[selectedQuality].height}p`;

    const url =
      selectedQuality === -1
        ? "Auto (determined by player)"
        : state.hlsPlayer.levels[selectedQuality].url;

    console.log(`Manually selected quality: ${qualityName}`);
    console.log(`Stream URL: ${url}`);
    updateStreamStatus(`Playing HLS stream (${qualityName})`);
  }
});

// Start/stop streaming button handler
startButton.addEventListener("click", () => {
  if (state.isStreaming) {
    startButton.textContent = "Start Streaming";
    state.isStreaming = false;
    cleanupPlayer();
    updateStreamStatus("Not streaming");
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
  updateStreamStatus("Starting stream...");

  // Initialize the stream player
  setTimeout(() => {
    initializeHLSPlayer();
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
