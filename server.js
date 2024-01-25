const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const { createdChats } = require("../mern-app-backend/app/controllers/chat.controller")
const http = require('http');
// const https = require('https');
// const fs = require('fs');
const dbConfig = require("./app/config/db.config");


require("dotenv").config();
const app = express();

app.use(cors());
// parse requests of content-type - application/json
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(
  cookieSession({
    name: "my-app-session",
    keys: ["COOKIE_SECRET"], // should use as secret environment variable
    httpOnly: true
  })
);

const db = require("./app/models");

let connectionString = "";

connectionString = `mongodb://${dbConfig.USERNAME}:${dbConfig.PASSWORD}@${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

// console.log('Connection string is', connectionString)

db.mongoose.set("strictQuery", false);

db.mongoose
  .connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Successfully connected to MongoDB.");
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit();
  });

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to API." });
});

// routes
require("./app/routes/auth.routes")(app);
require("./app/routes/admin.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/provider.routes")(app);
require("./app/routes/admin_user.routes")(app);
require("./app/routes/admin_provider.routes")(app);
require("./app/routes/service.routes")(app);
require("./app/routes/job.routes")(app);
require("./app/routes/transaction.routes")(app);
require("./app/routes/plan.routes")(app);
require("./app/routes/notification.routes")(app);
// require("./app/routes/chat.routes")(app);

// set port, listen for requests

// require('./socket/socket')(io)


const PORT = process.env.PORT || 9210;


setInterval(() => {
  db.job.updateMany(
    {
      startTime: { $lt: new Date().toISOString() },
      jobStatus: "UP",
      quoteStatus: "accepted",
      requestStatus: "accepted",
    },
    { $set: { jobStatus: "ON" } }
  ).then((updatedRecord) => {
  });
}, 60000);

// const options = {
//   key: fs.readFileSync("/home/jenkins/SSL/ss.key"),
//   cert: fs.readFileSync("/home/jenkins/SSL/ss.crt"),
// };
// Socket.IO
const server = http.createServer(app);
// const server = https.createServer(options, app);

// const { Server } = require("socket.io");
const io = require("socket.io")(server, {
  maxHttpBufferSize: 1e12,
  cors: {
    origin: "*",
  },
});

// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
// });

require("./app/SocketEvent/socket").socketEvent(io)

server.listen(PORT, () => {
  console.log(`${process.env.NODE_ENV} server is running on port ${PORT}.`);
});

// server.listen(9219, () => {
//   console.log(`socket  running on port 8181`);
// });
// app.listen(PORT, () => {
//   console.log(`${process.env.NODE_ENV} server is running on port ${PORT}.`);
// });