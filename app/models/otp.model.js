const mongoose = require("mongoose");

const Otp = mongoose.model(
    "Otp",
    new mongoose.Schema({
        email: String,
        otp: Number
    })
);

module.exports = Otp;