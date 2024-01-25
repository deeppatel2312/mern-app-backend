const db = require("../models");
const Admin = db.admin;

checkDuplicateEmail = (req, res, next) => {
    // Email
    Admin.findOne({
      email: req.body.email
    }).exec((err, admin) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (admin) {
        res.status(400).send({ message: "Failed! Email is already in use!" });
        return;
      }

      next();
    });
};

const verifySignUp = {
  checkDuplicateEmail
};

module.exports = verifySignUp;
