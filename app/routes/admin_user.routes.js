const { authJwt } = require("../middlewares");
const controller = require("../controllers/admin-user.controller");
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

  app.get("/api/admin-user/countAll", [authJwt.verifyToken], controller.countAll);
  app.post("/api/admin-user/findAll", [authJwt.verifyToken], controller.findAll);
  app.post("/api/admin-user/findByDateRange", [authJwt.verifyToken], controller.findByDateRange);
  app.post("/api/admin-user/findById", [authJwt.verifyToken], controller.findById);
  app.post("/api/admin-user/deleteById", [authJwt.verifyToken], controller.deleteById);
  app.post("/api/admin-user/update", [authJwt.verifyToken], controller.update);
  app.post("/api/admin-user/create", [authJwt.verifyToken], controller.create);
  app.post("/api/admin-user/updateUserType", [authJwt.verifyToken], controller.updateUserType);
  app.get("/api/admin-user/findAllUser", [authJwt.verifyToken], controller.findAllUser);
  app.post("/api/admin-user/findAllJobs", [authJwt.verifyToken], controller.findAllJobs);
  app.post("/api/admin-user/createJob", [authJwt.verifyToken], upload.fields([
    { name: 'startSelfie', maxCount: 1 },
    { name: 'endSelfie', maxCount: 1 },
    { name: 'quoteFiles' },
  ]), controller.createJob);
  app.post("/api/admin-user/updateJob", [authJwt.verifyToken], controller.updateJob);
  app.post("/api/admin-user/findJobById", [authJwt.verifyToken], controller.findJobById);
  app.post("/api/admin-user/deleteJobById", [authJwt.verifyToken], controller.deleteJobById);
  app.get("/api/admin-user/getAllUser", [authJwt.verifyToken], controller.getAllUser);
  app.post("/api/admin-user/getAllDispute", [authJwt.verifyToken], controller.getAllDispute);
  app.post("/api/admin-user/createDispute", [authJwt.verifyToken], upload.fields([
    { name: 'providerDisputePicture', maxCount: 1 },
    { name: 'userDisputePicture', maxCount: 1 }
  ]), controller.createDispute);
  app.post("/api/admin-user/updateDispute", [authJwt.verifyToken], upload.fields([
    { name: 'providerDisputePicture', maxCount: 1 },
    { name: 'userDisputePicture', maxCount: 1 }
  ]), controller.updateDispute);
  app.post("/api/admin-user/getDisputeById", [authJwt.verifyToken], controller.getDisputeById);
  app.post("/api/admin-user/deleteDisputeById", [authJwt.verifyToken], controller.deleteDisputeById);
  app.post("/api/admin-user/getAllReport", [authJwt.verifyToken], controller.getAllReport);
  app.post("/api/admin-user/updateReport", [authJwt.verifyToken], controller.updateReport);
  app.post("/api/admin-user/getReportById", [authJwt.verifyToken], controller.getReportById);
  app.post("/api/admin-user/deleteReportById", [authJwt.verifyToken], controller.deleteReportById);
  app.get("/api/admin-user/getSettings", [authJwt.verifyToken], controller.getSettings);
  app.post("/api/admin-user/updateSetting", [authJwt.verifyToken], controller.updateSetting);
  app.post("/api/admin-user/getAllRatingReview", [authJwt.verifyToken], controller.getAllRatingReview);
  app.post("/api/admin-user/updateRatingReview", [authJwt.verifyToken], controller.updateRatingReview);
  app.post("/api/admin-user/getRatingReviewById", [authJwt.verifyToken], controller.getRatingReviewById);
  app.post("/api/admin-user/deleteRatingReviewById", [authJwt.verifyToken], controller.deleteRatingReviewById);
  app.post("/api/admin-user/getContentById", controller.getContentById);
  app.post("/api/admin-user/updateContent", [authJwt.verifyToken], controller.updateContent);
  app.get("/api/admin-user/getAllContent", controller.getAllContent);
  app.post("/api/admin-user/generateExcelForAllJobs", [authJwt.verifyToken], controller.generateExcelSheetForAllJobs);
};
