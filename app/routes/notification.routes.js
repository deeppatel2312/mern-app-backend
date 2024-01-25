const controller = require("../controllers/notification.controller");
const { authJwt } = require("../middlewares");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });

  app.post("/api/notification/list", [authJwt.verifyToken], controller.listNotifications);
  app.post("/api/notification/listWithPagination", [authJwt.verifyToken], controller.listNotificationsWithPagination);
};
