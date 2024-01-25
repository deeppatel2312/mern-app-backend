const { authJwt } = require("../middlewares");
const controller = require("../controllers/service.controller");
const multer = require("multer");
const db = require("../models");
const Service = db.service;

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

  app.get("/api/service/countAll", [authJwt.verifyToken], controller.countAll);
  app.post("/api/service/findAll", [authJwt.verifyToken], controller.findAll);
  app.post("/api/service/findById", [authJwt.verifyToken], controller.findById);
  app.post(
    "/api/service/deleteById",
    [authJwt.verifyToken],
    controller.deleteById
  );
  app.post("/api/service/update", [authJwt.verifyToken], controller.update);
  
  app.post("/api/service/updateWithImage",[authJwt.verifyToken],upload.single("image"),(req, res) => {
    // app.post(
      //   "/api/service/updateWithImage",
      //   [authJwt.verifyToken],
      //   (req, res) => {
        // let fileNameArr = []
        // req.files.map((ele) => {
          //   fileNameArr.push(ele.filename)
          // })
          // req.body.image = fileNameArr;
          if(req.file) {
            req.body['image'] = req.file.filename
      }
      req.body.updatedAt = new Date().toISOString()
      Service.updateOne({ _id: req.body._id }, req.body)
      .then((data) => {
        res.send({status : true, message: "Data successfully updated"});
      })
        .catch((err) => {
          res.status(500).send({
            message:
            err.message || "Some error occurred while retrieving services.",
          });
        });
    }
    );
    
    app.post("/api/service/create", [authJwt.verifyToken], upload.single("image"), (req, res) => {
      // app.post("/api/service/create", [authJwt.verifyToken], (req, res) => {
        // let fileNameArr = []
        // req.files.map((ele) => {
          //   fileNameArr.push(ele.filename)
          // })
    // req.body.image = fileNameArr;
    // console.log(req.file)
    if(req.file) {
      req.body['image'] = req.file.filename
    }
    Service.insertMany([req.body])
      .then((data) => {
        res.send(JSON.stringify(data));
      })
      .catch((err) => {
        res.status(500).send({
          message:
          err.message || "Some error occurred while retrieving services.",
        });
      });
    });
    app.post("/api/service/getAllService", [authJwt.verifyToken], controller.getAllService);
  };
  