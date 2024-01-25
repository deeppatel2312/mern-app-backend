const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");
const express = require("express");
const multer = require('multer');
const db = require("../models");
var nodemailer = require("nodemailer");
var bcrypt = require("bcryptjs");
const validator = require('validator');
const ProviderService = require("../models/providerService.model");
const User = db.user;

function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000);
}

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.use(express.urlencoded({ extended: false }));

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            // upload them to public folder
            cb(null, './public/')
        },
        filename: function (req, file, cb) {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    })

    const upload = multer({ storage })

    app.post('/api/user/signup', upload.fields([
        { name: 'profilePic', maxCount: 1 },
        { name: 'businessLicense', maxCount: 1 },
        { name: 'passportOrLicense', maxCount: 1 },

    ]), controller.signup);

    app.post('/api/user/updateProfile', [authJwt.verifyToken], upload.fields([
        { name: 'profilePic', maxCount: 1 }
    ]), controller.updateProfile);

    app.post("/api/user/sendOtp", controller.sendOtp);
    app.post("/api/user/verifyEmail", controller.verifyEmail);
    app.post("/api/user/login", controller.login);
    app.post("/api/user/logout", [authJwt.verifyToken], controller.logout);
    app.post("/api/user/forgotPassword", controller.forgotPassword);
    app.post("/api/user/checkForgotOtp", controller.checkForgotOtp);
    // app.post("/api/user/jobList", controller.jobList);
    app.post("/api/user/resetPassword", controller.resetPassword);
    app.post("/api/user/serviceSearch", controller.serviceSearch);
    app.post("/api/user/serviceFilter", controller.serviceFilter);
    app.post("/api/user/saveRating", [authJwt.verifyToken], controller.saveRating);
    app.post("/api/user/getRatingsList", [authJwt.verifyToken], controller.getRatingsList);
    app.post("/api/user/getChildrenServices", controller.getChildrenServices);
    app.post("/api/user/findProviderByServiceId", [authJwt.verifyToken], controller.findProviderByServiceId);
    app.post("/api/user/getProviderRatingDetail", [authJwt.verifyToken], controller.getProviderRatingDetail);
    app.post("/api/user/switchUserType", [authJwt.verifyToken], controller.switchUserType);
    app.post("/api/user/myJobsList", [authJwt.verifyToken], controller.myJobsList);
    app.post("/api/user/findById", [authJwt.verifyToken], controller.findById);
    app.get("/api/user/findSavedAddress", [authJwt.verifyToken], controller.findSavedAddress);
    app.post("/api/user/recommendedProviders", controller.recommendedProviders);
    app.post("/api/user/jobRequestList", [authJwt.verifyToken], controller.jobRequestList);
    app.post("/api/user/checkEmail", controller.checkEmail);
    app.post("/api/user/checkEmailGoogle", controller.checkEmailGoogle);
    app.post("/api/user/fbLogin", controller.fbLogin);
    app.post("/api/user/googleLogin", controller.googleLogin);
    app.post("/api/user/cancelJob", [authJwt.verifyToken], controller.cancelJob);
    app.post("/api/sendReferralEmail", [authJwt.verifyToken], controller.sendReferEmail)
    app.post("/api/user/jobsList", [authJwt.verifyToken], controller.jobsList)
    app.post("/api/user/giveTip", [authJwt.verifyToken], controller.giveTip);
    app.post("/api/user/getLiveLocation", [authJwt.verifyToken], controller.getLiveLocation);
    app.post("/api/user/blockUser", [authJwt.verifyToken], controller.blockUser);
    app.post("/api/user/unblockUser", [authJwt.verifyToken], controller.unblockUser);
    app.post("/api/user/getBlockStatus", [authJwt.verifyToken], controller.getBlockStatus);
    app.post("/api/user/userTransactionCountsData", [authJwt.verifyToken], controller.userTransactionCountsData);
};
