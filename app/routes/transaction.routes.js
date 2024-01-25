const controller = require("../controllers/transaction.controller");
const { authJwt } = require("../middlewares");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept"
    );
    next();
  });

  app.get("/api/transaction/findAll", controller.findAll);
  app.post("/api/transaction/findByDateRange", controller.findByDateRange);
  app.post("/api/transaction/findAllTransaction", [authJwt.verifyToken], controller.findAllTransaction);
  app.post("/api/transaction/allTransactionsList", [authJwt.verifyToken], controller.allTransactionsList);
  app.post("/api/transaction/findTransactionById", [authJwt.verifyToken], controller.findTransactionById);
  app.post("/api/transaction/generateReport", [authJwt.verifyToken], controller.generateReport);
};
