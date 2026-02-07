const express = require("express");
const indexRouter = require("./routes/indexRouter");
const path = require("path");
const http = require('http');
const SocketIO = require("socket.io");
const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = SocketIO(server);

let waitingUsers = [];
let rooms = {};
io.on("connection", (socket) => {
    socket.on("joinroom", () => {
        if(waitingUsers.length > 0){
            let partner = waitingUsers.shift();
            let roomId = `${socket.id}-${partner.id}`;

            socket.join(roomId);
            partner.join(roomId);

            io.to(roomId).emit("joined", roomId);
        } else {
            waitingUsers.push(socket);
        }
    })

    socket.on("message", (data) => {
        socket.broadcast.to(data.room).emit("message", data.message);
    })

    socket.on("signalingMessage", (data) => {
        socket.broadcast.to(data.room).emit("signalingMessage", data.message);
    });

    socket.on("startVideoCall", (room) => {
        socket.broadcast.to(room).emit("incomingCall");
    })

    socket.on("acceptCall", (room) => {
        socket.broadcast.to(room).emit("callAccepted");
    })

    socket.on("rejectCall", (room) => {
        socket.broadcast.to(room).emit("callRejected");
    })

    socket.on("disconnect", (Socket) => {
        let index = waitingUsers.findIndex(user => user.id === Socket.id);
        waitingUsers.splice(index, 1)
    })
})

app.use("/", indexRouter);

server.listen(process.env.PORT || 3000);
