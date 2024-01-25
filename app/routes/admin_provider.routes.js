const { authJwt } = require("../middlewares");
const controller = require("../controllers/admin-provider.controller");
const multer = require("multer");


module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept"
    );
    next();
  });

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // upload them to public folder
      cb(null, "public");
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

  const upload = multer({
    storage: storage,
  });

  app.post("/api/admin-provider/findAll", [authJwt.verifyToken], controller.findAll);
  app.post("/api/admin-provider/findByDateRange", [authJwt.verifyToken], controller.findByDateRange);
  app.post("/api/admin-provider/findById", [authJwt.verifyToken], controller.findById);
  app.post("/api/admin-provider/deleteById", [authJwt.verifyToken], controller.deleteById);
  app.post("/api/admin-provider/update", [authJwt.verifyToken],upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'businessLicense', maxCount: 1 },
    { name: 'passportOrLicense', maxCount: 1 },
]), controller.update);
  app.post("/api/admin-provider/create", [authJwt.verifyToken],upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'businessLicense', maxCount: 1 },
    { name: 'passportOrLicense', maxCount: 1 },
]), controller.create);
  app.get("/api/admin-provider/findAllServices", [authJwt.verifyToken], controller.findAllServices);
  app.get("/api/admin-provider/findAllPlans", controller.findAllPlans);
  app.post("/api/admin-provider/findByserviceId",[authJwt.verifyToken], controller.findByserviceId);
  app.post("/api/admin-provider/findByRatingId",[authJwt.verifyToken], controller.findByRatingId);
  app.post("/api/admin-provider/updateRating",[authJwt.verifyToken], controller.updateRating);
  app.post("/api/admin-provider/deleteService",[authJwt.verifyToken], controller.deleteService);
  app.get("/api/admin-provider/findAllProvider",[authJwt.verifyToken], controller.findAllProvider);
  app.get("/api/admin-provider/getAllProvider",[authJwt.verifyToken], controller.getAllProvider);
};
