const { authJwt } = require("../middlewares");
const controller = require("../controllers/plan.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept"
    );
    next();
  });

  app.get("/api/subscription/countAll", [authJwt.verifyToken], controller.countAll);
  app.post("/api/subscription/findAll", [authJwt.verifyToken], controller.findAll);
  app.post("/api/subscription/findById", [authJwt.verifyToken], controller.findById);
  app.post("/api/subscription/deleteById", [authJwt.verifyToken], controller.deleteById);
  app.post("/api/subscription/update", [authJwt.verifyToken], controller.update);
  app.post("/api/subscription/create", [authJwt.verifyToken], controller.create);
  app.post("/api/subscription/release", [authJwt.verifyToken], controller.release);
};
