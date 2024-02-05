const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const gst = require('node-gstreamer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const pipeline = new gst.Pipeline('pipeline');
const src = new gst.Element('videotestsrc', 'src');
const videoConvert = new gst.Element('videoconvert', 'videoConvert');
const videoSink = new gst.Element('autovideosink', 'videoSink');

pipeline.add(src, videoConvert, videoSink);
src.link(videoConvert, videoSink);

wss.on('connection', (ws) => {
  ws.pipeline = pipeline;
  pipeline.setState(gst.State.PLAYING);

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'offer') {
      handleOffer(ws, data);
    } else if (data.type === 'answer') {
      handleAnswer(ws, data);
    } else if (data.type === 'ice-candidate') {
      handleIceCandidate(ws, data);
    }
  });

  ws.on('close', () => {
    pipeline.setState(gst.State.NULL);
  });
});

function handleOffer(ws, data) {
  ws.pipeline.createWebRTCEndpoint((err, webRTCEndpoint) => {
    if (err) {
      console.error('Error creating WebRTC endpoint:', err);
      return;
    }

    webRTCEndpoint.processOffer(data.sdp, (err, sdp) => {
      if (err) {
        console.error('Error processing offer:', err);
        return;
      }

      const answer = {
        type: 'answer',
        sdp,
      };

      ws.send(JSON.stringify(answer));

      webRTCEndpoint.on('ice-candidate', (candidate) => {
        const iceCandidate = {
          type: 'ice-candidate',
          candidate,
        };

        ws.send(JSON.stringify(iceCandidate));
      });

      ws.webRTCEndpoint = webRTCEndpoint;
    });
  });
}

function handleAnswer(ws, data) {
  ws.webRTCEndpoint.processAnswer(data.sdp, (err) => {
    if (err) {
      console.error('Error processing answer:', err);
      return;
    }
  });
}

function handleIceCandidate(ws, data) {
  ws.webRTCEndpoint.addIceCandidate(data.candidate, (err) => {
    if (err) {
      console.error('Error adding ICE candidate:', err);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
