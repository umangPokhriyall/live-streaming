# Live Streaming Transcoder

A self-hosted live streaming platform with built-in transcoding capabilities. This application allows you to:

- Capture your camera and microphone
- Transcode the media stream using FFmpeg
- Stream in multiple formats (FLV, HLS, DASH)
- Watch your stream directly in the browser

## Features

- Real-time video/audio capture
- RTMP streaming with Node-Media-Server
- FFmpeg transcoding
- Multiple output formats:
  - FLV (Flash Video)
  - HLS (HTTP Live Streaming)
  - DASH (Dynamic Adaptive Streaming over HTTP)
- Simple and intuitive UI

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Web camera and microphone

### Running with Docker

1. Clone this repository:

```
git clone <repository-url>
cd live-streaming
```

2. Start the application:

```
docker-compose up
```

3. Open your browser and navigate to:

```
http://localhost:3000
```

4. Allow camera/microphone access when prompted
5. Click "Start Streaming" to begin
6. Choose your preferred viewing format (FLV, HLS, DASH)

## Architecture

- **Frontend**: HTML/JS client with MediaRecorder API
- **Backend**: Node.js with Express and Socket.IO
- **Streaming Server**: Node-Media-Server
- **Transcoding**: FFmpeg

## Ports

- 3000: Web application
- 1935: RTMP server
- 8000: HTTP-FLV/HLS/DASH server

## Advanced Configuration

The FFmpeg parameters can be adjusted in `index.js` to change the quality, resolution, or other encoding settings.
