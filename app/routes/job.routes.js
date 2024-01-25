const controller = require("../controllers/job.controller");
const multer = require("multer");
const { authJwt } = require("../middlewares");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
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

  app.post("/api/job/findAll", [authJwt.verifyToken], controller.findAll);
  app.post("/api/job/findByDateRange", [authJwt.verifyToken], controller.findByDateRange);
  app.post("/api/job/create", [authJwt.verifyToken], controller.create);
  app.post("/api/job/update", controller.update);
  app.post("/api/job/findById", [authJwt.verifyToken], controller.findById);
  app.post("/api/job/updateQuoteStatus", [authJwt.verifyToken], controller.updateQuoteStatus);
  app.post("/api/job/matchOtp", [authJwt.verifyToken], controller.matchOtp);
  app.post("/api/job/quoteFileUpload", [authJwt.verifyToken], upload.fields([{ name: 'quoteFiles' }]), controller.quoteFileUpload);
  app.post("/api/job/calculateTaxAmount", [authJwt.verifyToken], controller.calculateTaxAmount);
  app.post("/api/job/calculateTaxByAmount", [authJwt.verifyToken], controller.calculateTaxByAmount);
  app.post("/api/job/generateInvoice", [authJwt.verifyToken], controller.generateInvoice);
};
