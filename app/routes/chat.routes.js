const controller = require("../controllers/chat.controller");
const { authJwt } = require("../middlewares");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });


  app.post("/api/chat/sendMessage", [authJwt.verifyToken], controller.sendMessage);
  app.post("/api/chat/receiveMessage", [authJwt.verifyToken], controller.receiveMessage);
  app.post("/api/chat/deleteMessage", [authJwt.verifyToken], controller.deleteMessage);
};
