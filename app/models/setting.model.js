const mongoose = require("mongoose");

const Setting = mongoose.model(
    "setting",
    new mongoose.Schema({
        range: Number,
        taxPercentage: Number,
        emailFrom: String,
        smtpService: String,
        smtpPort: Number,
        smtpSecure: String,
        gmailUsername: String,
        gmailAppPassword: String,
        commissionPercentage: Number
    })
);

module.exports = Setting;
