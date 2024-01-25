const mongoose = require("mongoose");

const Admin = mongoose.model(
  "Admin",
  new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    otp: String,
    createdAt: Date,
    updatedAt: Date,
    status: Number
  })
);

module.exports = Admin;
