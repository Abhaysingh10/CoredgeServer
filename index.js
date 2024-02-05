// Import required modules and packages
const express = require("express");
const { Writable } = require('stream');
const { exec } = require('child_process'); // Import exec from child_process

const app = express();
const port = 3000; // Set the port
const cors = require("cors");

let user = [];

const { Server } = require("socket.io");
const { createServer } = require("http");
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    credentials: false,
  },
});


const audioPipeline = 'udpsrc port=5000 ! application/x-rtp,media=audio,encoding-name=OPUS ! rtpopusdepay ! mux.';
const videoPipeline = 'udpsrc port=5001 ! application/x-rtp,encoding-name=H264,payload=96 ! rtph264depay  ! mux.';
const muxPipeline = 'matroskamux name=mux ! filesink location=video.mkv';

const gstreamerPipeline = `${audioPipeline} ${videoPipeline} ${muxPipeline}`;


// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


// Middleware for getting username while handshake


io.sockets.on("connection", (socket) => {
    console.log("User connected", socket.id)
  
    socket.on('callUser', (data) => {
        socket.broadcast.emit('incomingCall', data);
      });
    
      socket.on('acceptCall', (data) => {
        // console.log('Answer received:', data.signal);
        socket.broadcast.emit('callAccepted', data);
      });
    
      socket.on('ice-candidate', (data) => {
        console.log('ICE candidate received:', data);

        // Broadcast the ICE candidate to all connected clients except the sender
        socket.broadcast.emit('ice-candidate', data);
      });

      socket.on('callStarted', data=>{
        exec(`gst-launch-1.0 ${gstreamerPipeline}`, (error, stdout, stderr) => {
          if (error) {
              console.error(`Error executing GStreamer pipeline: ${stderr}`);
          }
      });
  
      const sink = new Writable({
        write(chunk, encoding, callback) {
            socket.emit('stream', chunk);
            callback();
        },
    });
  

      })  



  socket.on("disconnect", async () => {
    console.log("disconnected !!!!!@@@@!@##₹%")
   
  });

  function broadCastOnlineUsers(users) {
    // console.log("users",users)
    io.emit("connected-users", users);
  }

});

app.get("/", (req, res) => {
  res.send("Hello world !");
});


server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
