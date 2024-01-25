const { authJwt } = require("../middlewares");
const controller = require("../controllers/provider.controller");
const express = require("express");
const multer = require('multer');
const db = require("../models");
var nodemailer = require("nodemailer");
var bcrypt = require("bcryptjs");
const validator = require('validator');
const Provider = db.provider;
const ProviderService = db.providerService;
const User = db.user;
var mongoose = require('mongoose');

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

    app.post('/api/provider/updateProfile', [authJwt.verifyToken], upload.fields([
        { name: 'profilePic', maxCount: 1 }
    ]), controller.updateProfile);

    app.post('/api/provider/raiseDispute', [authJwt.verifyToken], upload.fields([
        { name: 'picture', maxCount: 1 }
    ]), controller.raiseDispute)

    app.post('/api/provider/serviceImageUpload', [authJwt.verifyToken], upload.fields([
        { name: 'serviceImages', maxCount: 5 }
    ]), controller.serviceImageUpload)

    app.post("/api/provider/serviceImageRemove", [authJwt.verifyToken], controller.serviceImageRemove);
    app.post("/api/provider/verifyEmail", controller.verifyEmail);
    app.post("/api/provider/forgotPassword", controller.forgotPassword);
    app.post("/api/provider/checkForgotOtp", controller.checkForgotOtp);
    app.post("/api/provider/resetPassword", controller.resetPassword);
    app.post("/api/provider/updateTrackingStatus", controller.updateTrackingStatus);
    app.post("/api/provider/getRatingsList", [authJwt.verifyToken], controller.getRatingsList);
    app.post("/api/provider/reportReview", controller.reportReview);
    app.get("/api/provider/getServiceList", controller.getServiceList);
    app.post("/api/provider/getProviderServicesList", [authJwt.verifyToken], controller.getProviderServicesList);
    app.get("/api/provider/getPlanList", [authJwt.verifyToken], controller.getPlanList);
    app.post("/api/provider/updateAvailability", [authJwt.verifyToken], controller.updateAvailability);
    app.post("/api/provider/changePassword", [authJwt.verifyToken], controller.changePassword);
    app.get("/api/provider/getProfile", [authJwt.verifyToken], controller.getProfile);
    // app.post("/api/provider/syncCalendar", [authJwt.verifyToken], controller.syncCalendar);
    app.post("/api/provider/jobRequestList", [authJwt.verifyToken], controller.jobRequestList);
    app.post("/api/provider/changeJobStatus", [authJwt.verifyToken], controller.changeJobStatus);
    app.post("/api/provider/allJobsList", [authJwt.verifyToken], controller.allJobsList);
    app.post("/api/provider/findJobById", [authJwt.verifyToken], controller.findJobById);
    app.post("/api/provider/myJobsList", [authJwt.verifyToken], controller.myJobsList);
    app.post('/api/provider/uploadSelfie', [authJwt.verifyToken], upload.fields([
        { name: 'startSelfie', maxCount: 1 },
        { name: 'endSelfie', maxCount: 1 }
    ]), controller.uploadSelfie)
    app.post("/api/provider/dashboardCountsData", [authJwt.verifyToken], controller.dashboardCountsData);
    app.post("/api/provider/dashboardProjectsData", [authJwt.verifyToken], controller.dashboardProjectsData);
    app.post("/api/provider/reviewSummery", [authJwt.verifyToken], controller.reviewSummery);
    app.post("/api/provider/jobSummery", [authJwt.verifyToken], controller.jobSummery);

    app.post("/api/provider/providerAvailability", [authJwt.verifyToken], controller.providerAvailability);
    app.post("/api/provider/updateShiftTiming", [authJwt.verifyToken], controller.updateShiftTiming);
    app.post("/api/provider/purchaseSubscription", [authJwt.verifyToken], controller.purchaseSubscription);
    app.post("/api/provider/addBankDetail", [authJwt.verifyToken], controller.addBankDetail);
    app.post("/api/provider/updateBankDetail", [authJwt.verifyToken], controller.updateBankDetail);
    app.post("/api/provider/updateNotificationSettings", [authJwt.verifyToken], controller.updateNotificationSettings);
    app.post("/api/provider/getNotificationSettings", [authJwt.verifyToken], controller.getNotificationSettings);
    app.post("/api/provider/checkSubscriptionStatus", [authJwt.verifyToken], controller.checkSubscriptionStatus);
    app.post("/api/provider/checkPromoCode", [authJwt.verifyToken], controller.checkPromoCode);
    app.post("/api/provider/ongoingTruckingJobsList", [authJwt.verifyToken], controller.ongoingTruckingJobsList);
    app.post("/api/provider/transactionCountsData", [authJwt.verifyToken], controller.transactionCountsData);
};
