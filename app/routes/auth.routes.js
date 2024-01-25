const { verifySignUp, authJwt } = require("../middlewares");
const controller = require("../controllers/auth.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/api/auth/signup",
    [
      verifySignUp.checkDuplicateEmail
    ],
    controller.signup
  );

  app.get("/api/auth/getCounts", controller.getCounts);
  app.get("/api/auth/getJobStatuses", controller.getJobStatuses);
  app.post("/api/auth/signin", controller.signin);
  app.post("/api/auth/forgotPassword", controller.forgotPassword);
  app.post("/api/auth/signout", controller.signout);
  app.post("/api/auth/resetPassword", controller.resetPassword);
  app.post("/api/auth/cancelResetPassword", controller.cancelResetPassword);
  app.post("/api/auth/validateUser",[authJwt.verifyToken], controller.validateUser);
};
