const db = require("../models");
var nodemailer = require("nodemailer");
var bcrypt = require("bcryptjs");
const validator = require("validator");
const User = db.user;
const Service = db.service;
const ProviderService = db.providerService;
const Transaction = db.transaction;
const Job = db.job;
const SavedAddresses = db.savedAddresses;
const Subscription = db.subscription;
const Otp = db.otp;
const UserDevice = db.userDevice;
const Notification = db.notification;
const Chat = db.chat;
var jwt = require("jsonwebtoken");
const Rating = require("../models/rating.model");
require("dotenv").config();
var mongoose = require("mongoose");
const { sendPushNotification } = require("../helpers/pushNotifications");
var axios = require("axios");
const getAllSettings = require("../constants/settings");
let settings = null;
(async () => {
    settings = await getAllSettings();
})();

function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000);
}

function isEmpty(obj) {
    for (const prop in obj) {
        if (Object.hasOwn(obj, prop)) {
            return false;
        }
    }

    return true;
}

function getFormattedDate(date) {
    // let dateStr = date.toISOString().split('T')[0];
    let dateStr = date.toLocaleString().split(",")[0];
    dateStr = dateStr.split("/");
    if (dateStr[0] < 10) {
        dateStr[0] = "0" + dateStr[0];
    }
    if (dateStr[1] < 10) {
        dateStr[1] = "0" + dateStr[1];
    }
    dateStr = dateStr.reverse().join("-");
    return dateStr;
}

// verify the email by checking the 6 character OTP sent to the user's email, against the OTP in the database
// and set the isActive to true
exports.verifyEmail = async (req, res) => {
    if (
        !req.body.email ||
        !req.body.otp ||
        !validator.isEmail(req.body.email) ||
        req.body.otp.length !== 4
    ) {
        res.status(400).send({ status: false, message: "Invalid email or otp." });
        return;
    }

    let otpData = await Otp.findOne({ email: req.body.email });
    console.log("req.body.otp=>", req.body.otp, "otpData.otp=>", otpData.otp);
    if (req.body.otp == otpData.otp) {
        res.status(200).send({
            status: true,
            message: "Email verified successfully.",
        });
    } else {
        res.status(200).send({
            status: false,
            message: "OTP is incorrect.",
        });
    }
};

// login the user
exports.login = async (req, res) => {
    // check if any field is empty and email is valid
    if (
        !req.body.email ||
        !req.body.password ||
        !validator.isEmail(req.body.email)
    ) {
        res
            .status(400)
            .send({ status: false, message: "Email or password is invalid." });
        return;
    }

    // check if user exists and password is correct
    try {
        const user = await User.findOne({
            email: req.body.email,
        }).exec();

        if (!user) {
            res.status(400).send({ status: false, message: "User not found." });
            return;
        }

        if (!user.isActive) {
            res.status(400).send({ status: false, message: "User is not active." });
            return;
        }

        if (user.userType == "provider" && !user.isApproved) {
            res.status(400).send({ status: false, message: "User is not approved." });
            return;
        }

        var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);

        if (!passwordIsValid) {
            res.status(400).send({ status: false, message: "Invalid password." });
            return;
        }

        var token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: 31536000, // 1 year
        });

        try {
            await User.updateOne({ _id: user._id }, { token: token });
        } catch (error) {
            console.log("Error while updating token data for user:", error);

            return res.status(500).send({
                status: false,
                message: "Internal error occurred",
            });
        }

        let isSubscribed = false;

        if (user.userType == "provider") {
            let subscriptionData = await Subscription.findOne({
                providerId: mongoose.Types.ObjectId(user._id),
            });

            if (subscriptionData !== null) {
                isSubscribed = true;
            }
        }

        if (!req.body.fcmToken || !req.body.deviceType || !req.body.deviceId) {
            return res.status(400).send({
                status: false,
                message: "Unable to login. Please try again.",
            });
        }

        // for push notification
        const userDeviceInfo = await UserDevice.findOne({
            userId: user._id,
            deviceId: req.body.deviceId,
        }).exec();
        if (userDeviceInfo && userDeviceInfo.fcmToken !== req.body.fcmToken) {
            try {
                let jsonData = {
                    fcmToken: req.body.fcmToken,
                    updatedAt: new Date().toISOString(),
                };
                //update the existing document because fcmtoken has changed for that device and userid
                await UserDevice.findOneAndUpdate(
                    { userId: user._id, deviceId: req.body.deviceId },
                    { $set: jsonData },
                    { new: true }
                );
            } catch (error) {
                console.log("error", error);
                res
                    .status(500)
                    .send({ status: false, message: "Something went wrong" });
                return;
            }
        } else if (!userDeviceInfo) {
            try {
                //create new document if no userdevice information
                const userDevice = new UserDevice({
                    userId: user._id,
                    fcmToken: req.body.fcmToken,
                    deviceType: req.body.deviceType,
                    deviceId: req.body.deviceId,
                });
                await userDevice.save();
            } catch (error) {
                console.log("error", error);
                res
                    .status(500)
                    .send({ status: false, message: "Something went wrong" });
                return;
            }
        }

        res.status(200).send({
            status: true,
            id: user._id,
            isSubscribed: isSubscribed,
            userType: user.userType,
            profilePic: user.profilePic,
            token: token,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            ratingUser: user.ratingUser,
            ratingProvider: user.ratingProvider,
            numberOfRatings: user.numberOfRatings,
            starOne: user.starOne,
            starTwo: user.starTwo,
            starThree: user.starThree,
            starFour: user.starFour,
            starFive: user.starFive,
            wasUserPreviously: user.wasUserPreviously,
            message: "User logged in successfully!",
        });
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
};

exports.logout = async (req, res) => {
    try {
        console.log("id is", req.personId);
        await User.updateOne({ _id: req.personId }, { token: "" });

        return res.status(200).send({
            status: true,
            message: "User logged out",
        });
    } catch (error) {
        console.log("Error while logging out the user:", error);

        return res.status(500).send({
            status: false,
            message: "Internal error occurred",
        });
    }
};

// forgot password function called forgotPassword
// get email from request body
// find user by email
// if user is not found then return error
// if user is found then generate random 4 digit otp
// set otp to user in database
// save user object
// send email to user with token
exports.forgotPassword = async (req, res) => {
    // log the current time in dd/mm/yyyy format
    let today = new Date();
    today = today.toISOString();
    console.log("forgot hit at " + today);
    const { email } = req.body;
    try {
        User.findOne({ email }, (err, user) => {
            if (err) {
                res.status(500).send({ status: false, message: err });
                return;
            }

            if (!user) {
                res.status(400).send({ status: false, message: "User not found." });
                return;
            }

            let otp = generateOtp();

            user.otp = otp;
            user.save((err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // this is the html for reset password email
                let html = `<p>Hi ${user.firstName},</p>
                    <p>Here is your reset password OTP.</p>
                    <p style="font-size: 35px;"><strong>${otp}</strong></p>
                    <p>Thanks,</p>
                    <p><strong> Team</strong></p>`;

                const transporter = nodemailer.createTransport({
                    service: settings.smtpService,
                    auth: {
                        user: settings.gmailUsername,
                        pass: settings.gmailAppPassword,
                    },
                });

                send();

                async function send() {
                    const result = await transporter.sendMail({
                        from: settings.emailFrom,
                        to: email,
                        subject: " - Reset your password",
                        html: html,
                    });

                    let emailResponse = result.response;
                    // check if emailResponse string contains OK
                    if (emailResponse.includes("OK")) {
                        return res
                            .status(200)
                            .send({ status: true, message: "OTP sent on email." });
                    } else {
                        return res.status(500).send({
                            status: false,
                            message: "Error sending email. Please try again later.",
                        });
                    }
                }
            });
        });
    } catch (err) {
        console.log(err);
    }
};

// check if the otp is correct and send success so that user can reset the password
exports.checkForgotOtp = async (req, res) => {
    // check if any field is empty and email is valid
    if (!req.body.email || !req.body.otp || !validator.isEmail(req.body.email)) {
        res
            .status(400)
            .send({ status: false, message: "Email or OTP is invalid." });
        return;
    }

    // check if user exists and otp is correct
    User.findOne({
        email: req.body.email,
    }).exec((err, user) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        if (!user) {
            res.status(400).send({ status: false, message: "User not found." });
            return;
        }

        if (!user.isActive) {
            res.status(400).send({ status: false, message: "User is not active." });
            return;
        }

        if (user.otp !== req.body.otp) {
            res.status(400).send({ status: false, message: "Invalid OTP." });
            return;
        }

        res.status(200).send({
            status: true,
            message: "OTP is correct. You can reset your password.",
        });
    });
};

// this is resetPassword function
// get email, password and confirm password from request body
exports.resetPassword = async (req, res) => {
    // check if any field is empty and email is valid
    if (
        !req.body.email ||
        !req.body.password ||
        !req.body.confirmPassword ||
        !validator.isEmail(req.body.email)
    ) {
        res
            .status(400)
            .send({ status: false, message: "Email or password is invalid." });
        return;
    }

    // check if password and confirm password match
    if (req.body.password !== req.body.confirmPassword) {
        res.status(400).send({ status: false, message: "Passwords do not match." });
        return;
    }

    // check if user exists and password is correct
    User.findOne({
        email: req.body.email,
    }).exec((err, user) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        if (!user) {
            res.status(400).send({ status: false, message: "User not found." });
            return;
        }

        if (!user.isActive) {
            res.status(400).send({ status: false, message: "User is not active." });
            return;
        }

        // hash password
        var password = bcrypt.hashSync(req.body.password, 8);

        user.password = password;
        // save user object
        user.save((err) => {
            if (err) {
                res.status(500).send({ status: false, message: err });
                return;
            }

            res
                .status(200)
                .send({ status: true, message: "Password reset successfully!" });
        });
    });
};

exports.serviceSearch = async (req, res) => {
    let { keyword } = req.body;
    keyword = keyword.trim();
    keyword = new RegExp(keyword, "ig");

    let request = {
        isActive: true,
        name: keyword,
    };
    if (req.body.isParent) {
        request = {
            isActive: true,
            name: keyword,
            parent: { $exists: false },
        };
    }
    Service.find(request).exec((err, services) => {
        if (err) {
            res.status(500).send({ message: err, status: false });
            return;
        }

        res.status(200).send({
            status: true,
            numberOfResults: services.length,
            services: services,
        });
    });
};

exports.serviceFilter = async (req, res) => {
    settings = await getAllSettings();
    let { filter, sortBy, pageNumber } = req.body;

    let lat = req.body.lat || 23.0459112;
    let lng = req.body.lng || 72.5019611;
    lat = Number(lat);
    lng = Number(lng);

    let resultsPerPage = 12;

    const skip = (pageNumber - 1) * resultsPerPage;
    let popularUserIds;

    sortBy.order = sortBy.order ? sortBy.order : "desc";
    let sortingType = {
        createdAt: sortBy.order === "desc" ? -1 : 1,
    };
    if (sortBy.field == "price") {
        sortingType = {
            rate: sortBy.order === "desc" ? -1 : 1,
        };
    } else if (sortBy.field == "rating") {
        sortingType = {
            userRating: sortBy.order === "desc" ? -1 : 1,
        };
    } else if (sortBy.field == "popular") {
        let popularSortOrder;
        if (sortBy.order == "asc") {
            popularSortOrder = 1;
        } else {
            popularSortOrder = -1;
        }

        let popularUsers = await Job.aggregate([
            {
                $match: {
                    jobStatus: "CO",
                },
            },
            {
                $group: {
                    _id: "$userId",
                    totalCompletedJobs: { $sum: 1 },
                },
            },
            {
                $sort: {
                    totalCompletedJobs: popularSortOrder,
                },
            },
        ]);

        popularUserIds = popularUsers.map((user) => user._id.toString());
    } else if (sortBy.field == "createdAt") {
        sortingType = {
            createdAt: sortBy.order === "desc" ? -1 : 1,
        };
    }

    let serviceId = filter.category;
    if (filter.subCategory) {
        serviceId = filter.subCategory;
    }
    if (serviceId) {
        serviceId = mongoose.Types.ObjectId(serviceId);
    }

    let serviceCond = {
        isActive: true,
    };
    if (serviceId) {
        serviceCond.$or = [];
        serviceCond.$or.push({ _id: serviceId });
    }

    let providerCond = {
        isActive: true,
    };
    if (filter.rating) {
        const lowerBound = Math.floor(filter.rating);
        const upperBound = lowerBound + 1;
        providerCond.userRating = {
            $gte: lowerBound,
            $lt: upperBound,
        };
    }
    if (filter.price.min && filter.price.max) {
        providerCond.rate = { $gte: +filter.price.min, $lte: +filter.price.max };
    }
    if (serviceId) {
        providerCond.serviceId = serviceId;
    }

    let nearestUsers = await User.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [lat, lng] },
                distanceField: "dist.calculated",
                maxDistance: Number(settings.range) * 1000,
                spherical: true,
            },
        },
        {
            $match: {
                isActive: true,
                userType: "provider",
            },
        },
        { $project: { _id: 1 } },
    ]);

    let providerIds = [];
    nearestUsers.forEach((provider) => {
        providerIds.push(provider._id.toString());
    });

    providerCond.userId = { $in: providerIds };

    if (sortBy.field == "popular") {
        const intersection = providerIds.filter((providerId) =>
            popularUserIds.includes(providerId)
        );
        providerCond.userId = { $in: intersection };
    }

    let resultProvider = await ProviderService.find(providerCond)
        .skip(skip)
        .limit(resultsPerPage)
        .populate("userId", {
            _id: 1,
            profilePic: 1,
            firstName: 1,
            lastName: 1,
            bio: 1,
            location: 1,
        })
        .populate("serviceId", {
            _id: 1,
            name: 1,
            jobType: 1,
        })
        .sort(sortingType);

    let countProvider = await ProviderService.countDocuments(providerCond);
    let totalPages = Math.ceil(countProvider / resultsPerPage);

    res.send({
        providerData: resultProvider,
        totalPages: totalPages,
        status: true,
    });
};

exports.getChildrenServices = async (req, res) => {
    let { serviceId } = req.body;
    if (!serviceId) {
        res.status(400).send({ status: false, message: "Service ID is required." });
        return;
    }

    Service.find({
        isActive: true,
        parent: mongoose.Types.ObjectId(serviceId),
    }).exec((err, services) => {
        res.status(200).send({
            status: true,
            services: services,
        });
    });
};

// this function is for adding a new rating
exports.saveRating = async (req, res) => {
    const {
        userType,
        reviewGivenTo,
        userRating,
        userReview,
        providerRating,
        providerReview,
        serviceId,
        jobId,
    } = req.body;

    let userId, providerId;

    if (userType == "user") {
        userId = req.personId;
        providerId = reviewGivenTo;
    } else if (userType == "provider") {
        providerId = req.personId;
        userId = reviewGivenTo;
    } else {
        return res.status(400).send({
            status: false,
            message: "Invalid user type.",
        });
    }

    let data = await User.findOne({ _id: reviewGivenTo });

    if (data && data.userType == "provider") {
        let updatedUserData = {};
        let newRatingData = providerRating;

        if (providerRating <= 1) {
            updatedUserData.starOne = ++data.starOne;
        } else if (providerRating <= 2) {
            updatedUserData.starTwo = ++data.starTwo;
        } else if (providerRating <= 3) {
            updatedUserData.starThree = ++data.starThree;
        } else if (providerRating <= 4) {
            updatedUserData.starFour = ++data.starFour;
        } else if (providerRating <= 5) {
            updatedUserData.starFive = ++data.starFive;
        }

        if (data.numberOfRatings == 0) {
            updatedUserData.ratingProvider = Number(newRatingData);
            updatedUserData.numberOfRatings = 1;
        } else {
            updatedUserData.ratingProvider = Number(
                (
                    (Number(newRatingData) +
                        Number(data.ratingProvider) * data.numberOfRatings) /
                    (data.numberOfRatings + 1)
                ).toFixed(1)
            );
            updatedUserData.numberOfRatings = 1 + data.numberOfRatings;
        }

        updatedUserData.updatedAt = new Date().toISOString();

        await User.updateMany({ _id: reviewGivenTo }, updatedUserData);
        await ProviderService.updateMany(
            { userId: providerId },
            { userRating: data.ratingProvider }
        );
    } else {
        let updatedUserData = {};
        let newRatingData = userRating;

        if (userRating <= 1) {
            updatedUserData.userStarOne = ++data.userStarOne;
        } else if (userRating <= 2) {
            updatedUserData.userStarTwo = ++data.userStarTwo;
        } else if (userRating <= 3) {
            updatedUserData.userStarThree = ++data.userStarThree;
        } else if (userRating <= 4) {
            updatedUserData.userStarFour = ++data.userStarFour;
        } else if (userRating <= 5) {
            updatedUserData.userStarFive = ++data.userStarFive;
        }

        if (data.userNumberOfRatings == 0) {
            updatedUserData.ratingUser = Number(newRatingData);
            updatedUserData.userNumberOfRatings = 1;
        } else {
            updatedUserData.ratingUser = Number(
                (
                    (Number(newRatingData) +
                        Number(data.ratingUser) * data.userNumberOfRatings) /
                    (data.userNumberOfRatings + 1)
                ).toFixed(1)
            );
            updatedUserData.userNumberOfRatings = 1 + data.userNumberOfRatings;
        }

        updatedUserData.updatedAt = new Date().toISOString();

        await User.updateMany({ _id: reviewGivenTo }, updatedUserData);
    }

    Service.findById(serviceId).exec(async (err, service) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        if (!service) {
            res.status(400).send({ status: false, message: "Service not found." });
            return;
        }

        const newRatingData = new Rating({
            userId: userId,
            providerId: providerId,
            serviceId: serviceId,
            jobId: jobId,
        });

        if (userRating && userReview) {
            newRatingData.userRating = userRating;
            newRatingData.userReview = userReview;
            var ratedByProvider = true;
        }

        if (providerRating && providerReview) {
            newRatingData.providerRating = providerRating;
            newRatingData.providerReview = providerReview;
            var ratedByUser = true;
        }

        let existingRating = await Rating.findOne({ jobId: jobId });

        if (existingRating) {
            let updatedRatingData = {};
            if (userRating && userReview) {
                updatedRatingData.userRating = userRating;
                updatedRatingData.userReview = userReview;
            }

            if (providerRating && providerReview) {
                updatedRatingData.providerRating = providerRating;
                updatedRatingData.providerReview = providerReview;
            }
            updatedRatingData.updatedAt = new Date().toISOString();

            await Rating.findByIdAndUpdate(existingRating._id, updatedRatingData);
        } else {
            await newRatingData.save();
        }

        await Job.findByIdAndUpdate(jobId, {
            ratedByUser: ratedByUser,
            ratedByProvider: ratedByProvider,
            updatedAt: new Date().toISOString(),
        });

        try {
            let allowNotificationTosend = false;
            if (data && data.userType === "provider") {
                allowNotificationTosend = data.providerNotificationRating;
            } else if (data && data.userType === "user") {
                allowNotificationTosend = data.userNotificationRating;
            }

            const userDeviceInfo = await UserDevice.find({ userId: reviewGivenTo });
            if (!userDeviceInfo) {
                console.log("No user devices information while creating dispute");
            }
            const notificationPayload = {
                title: "New rating",
                message: "New rating given",
                userType: userType,
                providerId: userType === "user" ? reviewGivenTo : null,
                userId: userType === "provider" ? reviewGivenTo : null,
                type: "rating",
            };
            // Save the notification
            const newNotification = new Notification(notificationPayload);
            await newNotification.save();
            if (allowNotificationTosend) {
                for (const userDevices of userDeviceInfo) {
                    const notificationPayload2 = {
                        ...notificationPayload,
                        fcmToken: userDevices.fcmToken,
                    };
                    // Send push notification
                    sendPushNotification(notificationPayload2);
                }
            }
            // sendPushNotification(notificationPayload)
        } catch (error) {
            console.log("error", error);
        }

        res.status(200).send({
            status: true,
            message: "Rating added successfully!",
        });
    });
};

exports.findProviderByServiceId = async (req, res) => {
    settings = await getAllSettings();
    let { serviceId, pageNumber } = req.body;
    const search = req.body.search || "";
    let lat = Number(req.body.lat);
    let lng = Number(req.body.lng);

    if (!lat || !lng) {
        res.status(400).send({
            status: false,
            message: "Location is required!",
        });

        return;
    }

    let resultsPerPage = 12;

    const skip = (pageNumber - 1) * resultsPerPage;

    let providerServiceConditions = {
        isActive: true,
    };

    if (serviceId) {
        providerServiceConditions.serviceId = serviceId;
    }

    if (search) {
        providerServiceConditions.$or = [];

        let userData = await User.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lat, lng] },
                    distanceField: "dist.calculated",
                    maxDistance: Number(settings.range) * 1000,
                    spherical: true,
                },
            },
            {
                $match: {
                    isActive: true,
                    userType: "provider",
                    $or: [
                        { firstName: { $regex: search, $options: "ig" } },
                        { lastName: { $regex: search, $options: "ig" } },
                    ],
                },
            },
        ]);

        let idArr = [];
        if (userData.length > 0) {
            userData.map((ele) => {
                idArr.push(ele._id);
            });
        }

        if (idArr.length > 0) {
            providerServiceConditions.$or.push({ userId: { $in: idArr } });
        }

        let ServiceData = await Service.find({
            $or: [{ name: { $regex: search, $options: "ig" } }],
            isActive: true,
        });

        let serviceIdArr = [];
        if (ServiceData.length > 0) {
            ServiceData.map((ele) => {
                serviceIdArr.push(ele._id);
            });
        }

        if (serviceIdArr.length > 0) {
            providerServiceConditions.$or.push({ serviceId: { $in: serviceIdArr } });
        }
    }

    let nearestUsers = await User.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [lat, lng] },
                distanceField: "dist.calculated",
                maxDistance: Number(settings.range) * 1000,
                spherical: true,
            },
        },
        {
            $match: {
                isActive: true,
                userType: "provider",
            },
        },
        { $project: { _id: 1 } },
    ]);

    let providerIds = [];
    nearestUsers.forEach((provider) => {
        providerIds.push(provider._id.toString());
    });

    providerServiceConditions.userId = { $in: providerIds };

    let data = await ProviderService.find(providerServiceConditions, {
        _id: 1,
        userId: 1,
        serviceId: 1,
        userRating: 1,
        rate: 1,
        images: 1,
    })
        .skip(skip)
        .limit(resultsPerPage)
        .populate("userId", {
            _id: 1,
            profilePic: 1,
            firstName: 1,
            lastName: 1,
            ratingProvider: 1,
            bio: 1,
            location: 1,
            loc: 1,
        })
        .populate("serviceId", { name: 1, jobType: 1 });

    let count = await ProviderService.countDocuments(providerServiceConditions);

    res.send({
        status: true,
        totalPages: Math.ceil(count / resultsPerPage),
        providerData: data,
    });
};

// Find rating By Provider Id
exports.getProviderRatingDetail = async (req, res) => {
    let { pageNumber, providerId, serviceId } = req.body;
    let resultsPerPage = 10;

    const skip = (pageNumber - 1) * resultsPerPage;

    let query = {
        providerId: mongoose.Types.ObjectId(providerId),
        isActiveForProvider: true,
    };

    if (serviceId) {
        query = {
            providerId: mongoose.Types.ObjectId(providerId),
            isActiveForProvider: true,
            serviceId: mongoose.Types.ObjectId(serviceId),
        };
    }

    try {
        let rating = await Rating.find(query).skip(skip).sort({ updatedAt: -1 }).limit(resultsPerPage).populate("userId");
        let count = await Rating.countDocuments(query);

        res.status(200).send({
            status: true,
            ratings: rating,
            count: count,
            totalPages: Math.ceil(count / resultsPerPage),
        });
    } catch (error) {
        console.log('Error while fetching provider rating details: ', error.message);

        return res.status(500).send({
            status: false,
            message: "Internal error while fetching ratings"
        });
    }
};

exports.switchUserType = async (req, res) => {
    let providerId = mongoose.Types.ObjectId(req.personId); // from JWT
    let type = req.body.currentUserType;

    let userType = "";
    if (type == "provider") {
        userType = "user";
    } else if (type == "user") {
        userType = "provider";
    } else {
        res.status(400).send({
            status: false,
            message: "User type not found!",
        });
    }

    let updatedUserData = {
        userType: userType,
        updatedAt: new Date().toISOString(),
    };

    try {
        let user = await User.findById(providerId);

        if (
            false === user.wasUserPreviously &&
            (undefined === user.isApproved || false === user.isApproved)
        ) {
            updatedUserData.userType = "user";

            let html = `
            <p>A user has requested to switch to provider profile. Here are the details:</p>
            <p>Full name: <b>${user.firstName} ${user.lastName}</b></p>
            <p>Email: <b>${user.email}</b></p>
            <p>Phone: <b>${user.phone}</b></p>
            <p>ID: <b>${user._id}</b></p>`;

            const transporter = nodemailer.createTransport({
                service: settings.smtpService,
                auth: {
                    user: settings.gmailUsername,
                    pass: settings.gmailAppPassword,
                },
            });

            await transporter.sendMail({
                from: settings.emailFrom,
                to: settings.emailFrom,
                subject: " - Provider Profile Approval",
                html: html,
            });

            updatedUserData.approvalStatus = "pending";
        }

        let dataAfterQuery = await User.findByIdAndUpdate(
            providerId,
            updatedUserData,
            { new: true }
        );

        let response = {
            status: true,
            userData: dataAfterQuery,
            message: "User type updated successfully.",
        };

        if (
            false === user.wasUserPreviously &&
            (undefined === user.isApproved || false === user.isApproved)
        ) {
            response.approvalMessage =
                "Switch profile request has been sent to admin. Once you're approved, you'll be able to switch to provider.";
        }

        res.status(200).send(response);
    } catch (err) {
        console.log("Error while switching user type: ", err);

        res.status(500).send({
            status: false,
            message: "Error while switching user type",
        });

        return;
    }
};

exports.myJobsList = async (req, res) => {
    const resultsPerPage = 5;
    let { pageNumber, jobStatus } = req.body;

    if (!jobStatus || !pageNumber) {
        res.status(400).send({
            status: false,
            message: "Job status and page number are required.",
        });

        return;
    }

    const skip = (pageNumber - 1) * resultsPerPage;
    const sortField = req.body.sortField || "createdAt";
    const sortOrder = req.body.sortOrder || "desc";
    const search = req.body.search || "";

    const sort = {};
    sort[sortField] = sortOrder === "asc" ? 1 : -1;

    let jobConditions = {
        userId: mongoose.Types.ObjectId(req.personId),
    };

    if (jobStatus == "UPCOMING") {
        jobConditions.jobStatus = { $in: ["UP", "ON"] };
    } else if (jobStatus == "PAST") {
        jobConditions.jobStatus = { $in: ["CO", "CN"] };
    } else {
        jobConditions.jobStatus = jobStatus;
    }

    let idArr = [];

    if (search) {
        let userData = await User.find({
            $or: [
                { firstName: { $regex: search, $options: "ig" } },
                { lastName: { $regex: search, $options: "ig" } },
            ],
            userType: "provider",
            isActive: true,
        });

        if (userData.length > 0) {
            userData.map((ele) => {
                idArr.push(ele._id);
            });
        }

        jobConditions.$or = [];
        jobConditions.$or.push(
            { serviceName: { $regex: search, $options: "ig" } },
            { providerId: { $in: idArr } }
        );
    }

    let jobs = await Job.find(jobConditions)
        .populate("userId")
        .populate("serviceId")
        .populate("providerId")
        .sort(sort)
        .skip(skip)
        .limit(resultsPerPage);
    let count = await Job.countDocuments(jobConditions);
    let jobRequestCount = await Job.countDocuments({
        quoteStatus: "pending",
        userId: mongoose.Types.ObjectId(req.personId),
    });

    res.send({
        status: true,
        totalPages: Math.ceil(count / resultsPerPage),
        jobRequestCount: jobRequestCount,
        jobs: jobs,
    });
};

exports.sendOtp = async (req, res) => {
    let otp = generateOtp();
    let existingData = await Otp.findOne({ email: req.body.email });

    if (existingData) {
        await Otp.updateOne({ _id: existingData._id }, { otp: otp });
    } else {
        let otpObject = new Otp({
            email: req.body.email,
            otp: otp,
        });

        otpObject.save();
    }

    let html = `
                < p > Thanks for signing up with .</ >
    <p>Enter this OTP in the app to verify your email.</p>
    <p style="font-size: 35px;"><strong>${otp}</strong></p>
    <p>Thanks,</p>
    <p><strong> Team</strong></p>`;

    const transporter = nodemailer.createTransport({
        service: settings.smtpService,
        auth: {
            user: settings.gmailUsername,
            pass: settings.gmailAppPassword,
        },
    });

    await transporter.sendMail({
        from: settings.emailFrom,
        to: req.body.email,
        subject: " - Verify your email",
        html: html,
    });

    res.status(200).send({
        status: true,
        message: "OTP sent on email.",
    });
};

exports.signup = (req, res) => {
    let { userType } = req.body;
    userType = userType.trim();

    // console.log('user type is ', userType)
    // return

    if (userType == "provider") {
        // log the current time in dd/mm/yyyy format
        let today = new Date();
        today = today.toISOString();
        console.log("provider signup hit at " + today);
        // console.log('files are ', req.files)

        // get the confirm password from body
        const confirmPassword = req.body.confirmPassword;

        // check if the password and confirm password are the same
        if (req.body.password !== confirmPassword) {
            res
                .status(400)
                .send({ status: false, message: "Passwords don't match." });
            return;
        }

        // check if any field is empty
        if (
            !req.body.firstName ||
            !req.body.email ||
            !req.body.password ||
            !req.body.phone
        ) {
            res
                .status(400)
                .send({ status: false, message: "Please fill in all fields." });
            return;
        }

        // check if acceptTerms is true
        if (!req.body.acceptTerms) {
            res.status(400).send({
                status: false,
                message: "Please accept the terms and conditions.",
            });
            return;
        }

        // console.log('before');

        // trim and lowercase the firstName and signature so that we can compare them
        let firstName = req.body.firstName.trim().toLowerCase();
        let signature = req.body.signature.trim().toLowerCase();

        // the signature field contains first name and last name
        // check if the signature is valid
        if (!signature.includes(firstName)) {
            res.status(400).send({ status: false, message: "Invalid signature." });
            return;
        }

        // check if the email is valid
        if (!validator.isEmail(req.body.email)) {
            res.status(400).send({ status: false, message: "Invalid email." });
            return;
        }

        User.findOne({
            email: req.body.email,
        }).exec((err, provider) => {
            if (err) {
                res.status(500).send({ status: false, message: err });
                return;
            }

            if (provider) {
                res
                    .status(400)
                    .send({ status: false, message: "Email already registered." });
                return;
            }

            let lastName = "";
            if (req.body.lastName) {
                lastName = req.body.lastName;
            }

            // services will be comma separated string of service ids
            // let services = req.body.services.split(",");

            // const profilePic = req.files.profilePic?.[0]?.filename || "";
            let profilePic;
            if (
                req.files &&
                req.files.profilePic &&
                req.files.profilePic.length > 0
            ) {
                profilePic = req.files.profilePic[0].filename;
            } else {
                profilePic = req.body.profilePic;
            }
            const businessLicense = req.files.businessLicense?.[0]?.filename || "";
            const passportOrLicense =
                req.files.passportOrLicense?.[0]?.filename || "";
            const workPermit = req.files.workPermit?.[0]?.filename || "";

            if (!profilePic || !businessLicense || !passportOrLicense) {
                res.status(400).send({
                    status: false,
                    message: "Please upload all the required documents.",
                });
                return;
            }

            provider = new User({
                firstName: req.body.firstName,
                lastName: lastName,
                email: req.body.email,
                phone: req.body.phone,
                password: bcrypt.hashSync(req.body.password, 8),
                profilePic: profilePic,
                businessLicense: businessLicense,
                passportOrLicense: passportOrLicense,
                userType: "provider",
                for: req.body.for,
            });

            provider.save((err, provider) => {
                if (err) {
                    res.status(500).send({ status: false, message: err });
                    return;
                }

                // start of the whole service data thing, to be put inside the providerServices collection

                let serviceArray = JSON.parse(req.body.services); // because there will be only one
                serviceId = serviceArray[0].id;
                let userId = provider._id.toString();

                let providerServiceObject = new ProviderService({
                    userId: userId,
                    serviceId: serviceId,
                    rate: 0,
                    userRating: 0,
                    location: "",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                providerServiceObject.save((err, providerService) => {
                    if (err) {
                        res.status(500).send({ message: err, status: false });
                        return;
                    }

                    return res.status(200).send({
                        status: true,
                        userType: "provider",
                        email: provider.email,
                        profilePic: req.files.profilePic
                            ? `${process.env.UPLOAD_PATH}${req.files.profilePic[0].filename}`
                            : profilePic,
                        message: "Provider was registered successfully!",
                    });
                });
            });
        });
    } else if (userType == "user") {
        // get the confirm password from body
        const confirmPassword = req.body.confirmPassword;

        // check if the password and confirm password are the same
        if (req.body.password !== confirmPassword) {
            res
                .status(400)
                .send({ message: "Passwords don't match.", status: false });
            return;
        }

        // check if any field is empty
        if (!req.body.firstName || !req.body.email || !req.body.password) {
            res
                .status(400)
                .send({ message: "Please fill in all fields.", status: false });
            return;
        }

        // check if the email is valid
        if (!validator.isEmail(req.body.email)) {
            res.status(400).send({ message: "Invalid email.", status: false });
            return;
        }

        User.findOne({
            email: req.body.email,
        }).exec((err, user) => {
            if (err) {
                res.status(500).send({ message: err, status: false });
                return;
            }

            if (user) {
                res
                    .status(400)
                    .send({ message: "Email already registered.", status: false });
                return;
            }

            let otp = generateOtp();

            // var token = jwt.sign({id: user._id }, process.env.JWT_SECRET, {
            //   expiresIn: 31536000 // 1 year
            // });

            let lastName = "";
            if (req.body.lastName) {
                lastName = req.body.lastName;
            }

            user = new User({
                firstName: req.body.firstName,
                lastName: lastName,
                email: req.body.email,
                phone: req.body.phone,
                password: bcrypt.hashSync(req.body.password, 8),
                otp: otp,
                userType: "user",
                socialName: req.body.socialName,
                social_id: req.body.social_id,
            });

            user.save((err, user) => {
                if (err) {
                    res.status(500).send({ message: err, status: false });
                    return;
                }

                return res.status(200).send({
                    status: true,
                    userType: "user",
                    email: user.email,
                    message: "User was registered successfully!",
                });
            });
        });
    } else {
        return res
            .status(400)
            .send({ message: "User type not found.", status: false });
    }
};

// Find Record by ID
exports.findById = async (req, res) => {
    const id = req.body._id;

    let personData = await User.findOne({ _id: id });
    let serviceData = {};
    if (req.body.serviceId) {
        serviceData = await ProviderService.findOne({
            userId: mongoose.Types.ObjectId(id),
            serviceId: mongoose.Types.ObjectId(req.body.serviceId),
        });
    }
    let response = {};
    response.personData = personData;
    if (!isEmpty(serviceData)) {
        response.serviceData = serviceData;
    }

    let expertiseData = await ProviderService.find(
        { userId: mongoose.Types.ObjectId(id), isActive: true },
        { serviceId: 1 }
    ).populate("serviceId", {
        name: 1,
    });
    let expertiseList = [];
    expertiseData.forEach((expertise) => {
        expertiseList.push(expertise.serviceId.name);
    });
    response.expertiseList = expertiseList;

    let existingJobData = await Job.find(
        { userId: mongoose.Types.ObjectId(req.personId), jobStatus: "CO" },
        { _id: 1 }
    )
        .sort({ updatedAt: -1 })
        .limit(1);

    let hasCompletedJob = false;
    let latestJobId = null;
    if (existingJobData.length > 0) {
        hasCompletedJob = true;
        latestJobId = existingJobData[0]._id;
    }
    response.hasCompletedJob = hasCompletedJob;
    response.latestJobId = latestJobId;

    let policyText = "";
    if (personData.cancellationPolicy === 48) {
        policyText = "Cancel before 48 hours at no charge (Strict)";
    } else if (personData.cancellationPolicy === 12) {
        policyText = "Cancel before 12 hours at no charge (Moderate)";
    } else if (personData.cancellationPolicy === 0) {
        policyText =
            "Cancel anytime before the job has started at no charge (Flexible)";
    } else {
        policyText = "";
    }

    response.policyText = policyText;

    res.status(200).send(response);
};

exports.findSavedAddress = (req, res) => {
    if (!req.query.type) {
        res.status(400).send({
            status: false,
            message: "Address type is required!",
        });

        return;
    }

    let id = req.personId;
    SavedAddresses.find({ userId: id, type: req.query.type })
        .then((data) => {
            res.send({
                status: true,
                data: data,
            });
        })
        .catch((err) => {
            res.send({
                status: false,
                err: err,
                message: "Something went wrong",
            });
        });
};

// recommended providers are found using the user's previous done jobs.
// get all the services the user has ever used
// find the providers by that service
exports.recommendedProviders = async (req, res) => {
    let { lat, lng } = req.body; // we'll use this when its dynamic
    // let lat = 23.0459112; // use this when static
    // let lng = 72.5019611;
    lat = Number(lat);
    lng = Number(lng);

    if (!lat || !lng) {
        res.status(400).send({
            status: false,
            message: "Location is required!",
        });
    }

    let { pageNumber } = req.body;
    const resultsPerPage = 12;
    const skip = (pageNumber - 1) * resultsPerPage;

    let conditionsProviders = {
        loc: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [lat, lng],
                },
                $maxDistance: Number(settings.range) * 1000,
            },
        },
        isActive: true,
    };

    let providers = await User.find(conditionsProviders, { _id: 1 });
    let providerIds = [];
    providers.forEach((provider) => {
        let id = provider._id.toString();
        if (!providerIds.includes(id)) {
            providerIds.push(id);
        }
    });

    ProviderService.find(
        { userId: { $in: providerIds } },
        { _id: 1, userId: 1, serviceId: 1, userRating: 1, rate: 1, images: 1 }
    )
        .skip(skip)
        .limit(resultsPerPage)
        .populate("userId", {
            _id: 1,
            profilePic: 1,
            firstName: 1,
            lastName: 1,
            ratingProvider: 1,
            bio: 1,
            location: 1,
            loc: 1,
        })
        .populate("serviceId", { name: 1, jobType: 1 })
        .then((data) => {
            const newData = data.filter((data) => data.userId != null);

            res.status(200).send({
                status: true,
                providerData: newData,
            });
        })
        .catch((err) => {
            console.log("err", err);
            res.status(500).send({ message: err, status: false });
        });
};

exports.jobRequestList = async (req, res) => {
    const pageNumber = req.body.pageNumber || 1; // Default to page 1 if pageNumber is not provided
    const resultsPerPage = 5; // Default to 5 results per page if not provided
    const search = req.body.search || "";
    //   console.log(req.personId)
    User.find({
        $or: [
            { firstName: { $regex: search, $options: "ig" } },
            { lastName: { $regex: search, $options: "ig" } },
        ],
        userType: "provider",
    })
        .then((providerData) => {
            let idArr = [];
            if (providerData.length > 0) {
                providerData.map((ele) => {
                    idArr.push(ele._id);
                });
            }
            Job.find({
                $or: [
                    { serviceName: { $regex: search, $options: "ig" } },
                    { providerId: { $in: idArr } },
                ],
                quoteStatus: "pending",
                userId: mongoose.Types.ObjectId(req.personId),
            })
                .populate("providerId")
                // .select("serviceName jobDetail startTime price")
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * resultsPerPage)
                .limit(resultsPerPage)
                .then((jobs) => {
                    Job.countDocuments({
                        $or: [
                            { serviceName: { $regex: search, $options: "ig" } },
                            { userId: { $in: idArr } },
                        ],
                        quoteStatus: "pending",
                        userId: mongoose.Types.ObjectId(req.personId),
                    }).then((count) => {
                        res.send({
                            totalPages: Math.ceil(count / resultsPerPage),
                            jobs: jobs,
                        });
                    });
                })
                .catch((err) => {
                    res.status(500).send({
                        message:
                            err.message || "Some error occurred while retrieving jobs.",
                    });
                });
        })
        .catch((err) => {
            res.status(500).send({
                status: false,
                message: "Some error occurred while retrieving data.",
            });
        });
};

exports.updateProfile = async (req, res) => {
    //name, phone, bio, pic
    let updatedData = { updatedAt: new Date().toISOString() };

    if (undefined !== req.files.profilePic && null !== req.files.profilePic) {
        updatedData.profilePic = req.files.profilePic[0].filename;
    }

    let firstName, lastName;
    if (req.body.name !== "") {
        let name = req.body.name;
        const words = name.split(" ");
        firstName = words[0];
        lastName = words.slice(1).join(" ");
    }

    if (firstName) {
        updatedData.firstName = firstName;
    }
    updatedData.lastName = lastName;
    if (req.body.bio) {
        updatedData.bio = req.body.bio;
    }
    if (req.body.phone) {
        updatedData.phone = req.body.phone;
    }

    User.findByIdAndUpdate(mongoose.Types.ObjectId(req.personId), updatedData)
        .then((userData) => {
            res.status(200).send({
                status: true,
                message: "User profile updated successfully!",
            });
        })
        .catch((err) => {
            res.status(500).send({ message: err, status: false });
        });
};

exports.getRatingsList = async (req, res) => {
    if (!req.body.pageNumber) {
        res.status(400).send({
            status: false,
            message: "Page number is required.",
        });

        return;
    }
    const resultsPerPage = 5;

    const pageNumber = req.body.pageNumber;
    let conditions = {
        userId: mongoose.Types.ObjectId(req.personId),
        isReported: false,
        isActiveForUser: true,
    };

    let ratings = await Rating.find(conditions)
        .sort({ updatedAt: -1 })
        .populate("providerId")
        .populate("serviceId")
        .skip((pageNumber - 1) * resultsPerPage)
        .limit(resultsPerPage);

    let count = await Rating.countDocuments(conditions);

    res.status(200).send({
        status: true,
        totalPages: Math.ceil(count / resultsPerPage),
        ratings: ratings,
    });
};

exports.checkEmail = async (req, res) => {
    try {
        const accessToken = req.body.accessToken;
        const response = await axios.get(
            `https://graph.facebook.com/v13.0/me?fields=id,name,email&access_token=${accessToken}`
        );
        const { id, name, email } = response.data; // Check if user exists in the database
        const userData = await User.findOne({ email: email });
        console.log(userData, "userDatauserData");
        if (userData) {
            if (
                userData.socialName == null ||
                (userData.socialName == "" && userData.facebookid == 0)
            ) {
                const query = { _id: userData._id };
                const update = {
                    $set: {
                        socialName: "facebook",
                        facebookid: id,
                    },
                };

                const result = await User.updateOne(query, update);
                console.log(result, "result after updation");
            }

            res.send({
                status: true,
                data: { registered: true, data: userData },
            });
        } else {
            res.send({
                status: true,
                message: "No user Found !",
            });
        }
    } catch (err) {
        console.log(err);
    }
};

exports.checkEmailGoogle = async (req, res) => {
    try {
        const accessToken = req.body.access_token;

        const response = await axios.get(
            `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`
        );
        const { id, name, email } = response.data; // Check if user exists in the database
        // console.log();
        const userData = await User.findOne({ email: response.data.email });
        if (userData) {
            if (userData.verified_email == false && userData.googleId == 0) {
                const query = { _id: userData._id };
                const update = {
                    $set: {
                        googleId: response.data.id,
                        verified_email: true,
                    },
                };

                const result = await User.updateOne(query, update);
            }

            res.send({
                status: true,
                data: { registered: true, data: userData },
            });
        } else {
            res.send({
                status: true,
                message: "No user Found !",
            });
        }
    } catch (err) {
        console.log(err);
    }
};

exports.fbLogin = async (req, res) => {
    try {
        const userData = await User.findOne({
            email: req.body.email,
            socialName: "facebook",
        });
        var token = jwt.sign({ id: userData._id }, process.env.JWT_SECRET, {
            expiresIn: 31536000, // 1 year
        });
        res.status(200).send({
            status: true,
            id: userData._id,
            userType: userData.userType,
            token: token,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            ratingUser: userData.ratingUser,
            ratingProvider: userData.ratingProvider,
            numberOfRatings: userData.numberOfRatings,
            starOne: userData.starOne,
            starTwo: userData.starTwo,
            starThree: userData.starThree,
            starFour: userData.starFour,
            starFive: userData.starFive,
            message: "User logged in successfully!",
        });
    } catch (err) {
        console.log(err);
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const userData = await User.findOne({
            email: req.body.email,
            verified_email: true,
        });
        console.log(userData, "userdata in ");
        var token = jwt.sign({ id: userData._id }, process.env.JWT_SECRET, {
            expiresIn: 31536000, // 1 year
        });
        res.status(200).send({
            status: true,
            id: userData._id,
            userType: userData.userType,
            token: token,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            ratingUser: userData.ratingUser,
            ratingProvider: userData.ratingProvider,
            numberOfRatings: userData.numberOfRatings,
            starOne: userData.starOne,
            starTwo: userData.starTwo,
            starThree: userData.starThree,
            starFour: userData.starFour,
            starFive: userData.starFive,
            message: "User logged in successfully!",
        });
    } catch (err) {
        console.log(err);
    }
};
/*
    The cancelJob API is only customer side. Because we have to check for cancellation policy duration.
*/
exports.cancelJob = async (req, res) => {
    try {
        let providerData = await User.findById(
            mongoose.Types.ObjectId(req.body.providerId)
        ).select("cancellationPolicy");
        let cancellationDuration = providerData.cancellationPolicy;
        let jobData = await Job.findById(
            mongoose.Types.ObjectId(req.body.jobId)
        ).select("startTime");
        let jobStartTime = jobData.startTime;
        let timestamp = req.body.timestamp;

        let hoursDifference =
            (new Date(jobStartTime).getTime() / 1000 - timestamp) / 60 / 60;

        let condition;
        if (cancellationDuration === 0) {
            condition = true;
        } else {
            condition = hoursDifference < cancellationDuration;
        }

        if (condition) {
            await Job.findByIdAndUpdate(mongoose.Types.ObjectId(req.body.jobId), {
                jobStatus: "CN",
                updatedAt: new Date().toISOString(),
            });

            res.status(200).send({
                status: true,
                message: "Job cancelled successfully.",
            });

            return;
        } else {
            // If the price is less than 50 $, then deduction amount will be price
            // If the price is greater, then deduction will be 50
            let jobPrice = Number(jobData.finalPrice);
            let deductionAmount = 0;

            if (jobPrice <= 50) {
                deductionAmount = jobPrice;
            } else {
                deductionAmount = 50;
            }

            res.status(200).send({
                status: true,
                message: `Job is cancelled. ${deductionAmount}$ has been deducted from your account.`,
            });

            return;
        }
    } catch (err) {
        console.log("Error while fetching provider data: ", err);

        res.status(500).send({
            status: false,
            message: "Internal error occured.",
        });

        return;
    }
};

/**
 * Send Refer email function
 */
exports.sendReferEmail = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res
            .status(400)
            .send({ status: false, message: "Email is required." });
    }

    try {
        let userData = await User.findById(req.personId).select(
            "firstName lastName userType"
        );
        let referrerName = userData.firstName + " " + userData.lastName;
        let html = "";
        let promoCode = "FREE";

        if (userData.userType == "provider") {
            html = `<p>Hi there,</p>
                    <p>${referrerName} has invited you to join !</p>
                    <p>Click on the following link to sign up and get 100% off on subscription with promo code <strong>${promoCode}</strong>:</p>
                    <p style="color: blue;"><a href="https://www.google.com">Join </a></p>
                    <p>Thanks,</p>
                    <p><strong> Team</strong></p>`;
        } else {
            html = `<p>Hi there,</p>
                  <p>${referrerName} has invited you to join !</p>
                  <p>Click on the following link to sign up:</p>
                  <p style="color:blue"><a href="https://www.google.com">Join </a></p>
                  <p>Thanks,</p>
                  <p><strong> Team</strong></p>`;
        }

        const transporter = nodemailer.createTransport({
            service: settings.smtpService,
            auth: {
                user: settings.gmailUsername,
                pass: settings.gmailAppPassword,
            },
        });

        try {
            const result = await transporter.sendMail({
                from: settings.emailFrom,
                to: email,
                subject: "Join  - Invitation from a friend",
                html: html,
            });

            let emailResponse = result.response;
            // Check if emailResponse string contains OK
            if (emailResponse.includes("OK")) {
                return res
                    .status(200)
                    .send({ status: true, message: "Referral email sent successfully." });
            } else {
                return res.status(500).send({
                    status: false,
                    message: "Error sending email. Please try again later.",
                });
            }
        } catch (error) {
            console.error("Error sending email:", error);

            return res.status(500).send({
                status: false,
                message: "Error sending email. Please try again later.",
            });
        }
    } catch (error) {
        console.error("Error fetching user data:", error);

        return res.status(500).send({
            status: false,
            message: "Error sending email. Please try again later.",
        });
    }
};

/*
    Ladies and gentlemen, behold, the universal list!
    Any person can fetch any type of job they want.
    The filters are sent in request body.
    e.g., {userId: "", requestStatus: "pending"}
*/
exports.jobsList = async (req, res) => {
    try {
        const resultsPerPage = req.body.resultsPerPage;
        const skip = (req.body.pageNumber - 1) * resultsPerPage;

        delete req.body.pageNumber;
        delete req.body.resultsPerPage;

        let jobsList = await Job.find(req.body)
            .skip(skip)
            .limit(resultsPerPage)
            .populate("userId")
            .populate("serviceId")
            .populate("providerId");

        let jobsCount = await Job.countDocuments(req.body);

        return res.send({ jobsList, totalPages: Math.ceil(jobsCount / resultsPerPage), });
    } catch (err) {
        console.log("Error while fetching jobs:", err);

        return res.status(500).send({
            status: false,
            message: "Error while fetching jobs",
        });
    }
};

exports.giveTip = async (req, res) => {
    let data = req.body;
    let trasnactionData = {
        transactionId: "",
        amount: data.tip,
        personId: mongoose.Types.ObjectId(req.personId),
        userType: data.userType,
        transactionType: "job", // because each tip is related to a job
    };

    try {
        await Transaction.insertMany([trasnactionData]);
        await Job.updateOne({ _id: data.jobId }, { tip: data.tip });

        return res.status(200).send({
            status: true,
            message: "Tip added successfully.",
        });
    } catch (err) {
        console.log("Error while updating Tip: ", err);

        return res.status(500).send({
            status: false,
            message: "Error while updating Tip.",
        });
    }
};

exports.getLiveLocation = async (req, res) => {
    try {
        let liveData = await Job.findById(req.body.jobId).select(
            "liveLat liveLong"
        );

        if (
            !liveData ||
            undefined === liveData.liveLat ||
            undefined === liveData.liveLong
        ) {
            return res.status(400).send({
                status: false,
                message: "No live tracking data found for the job.",
            });
        }

        return res.status(200).send({
            status: true,
            lat: liveData.liveLat,
            long: liveData.liveLong,
        });
    } catch (err) {
        console.log("Error while fetching location data:", err);

        return res.status(500).send({
            status: false,
            message: "Error while fetching location data",
        });
    }

    res;
};

// Block a user in the chat
exports.blockUser = async (req, res) => {
    try {
        const { chatId, blockingUserId, blockedUserId } = req.body;
        if (!chatId || !blockingUserId || !blockedUserId) {
            return res.status(400).send({
                status: false,
                message: "Please provide all details",
            });
        }

        const chat = await Chat.findById(chatId);

        // Check if the blockingUser has already blocked the blockedUser in this chat
        if (chat.blockedUsers.some((block) => block.userId.equals(blockedUserId))) {
            return res.status(400).json({
                status: false,
                message: "User is already blocked in this chat.",
            });
        }

        chat.blockedUsers.push({
            userId: blockedUserId,
            blockedBy: blockingUserId,
        });

        await chat.save();

        return res.status(200).json({
            status: true,
            message: "User blocked successfully in this chat.",
        });
    } catch (error) {
        console.error("Error while blocking user in chat:", error);

        return res.status(500).json({
            status: false,
            message: "Failed to block user in this chat.",
        });
    }
};

// Unblock a user in the chat
exports.unblockUser = async (req, res) => {
    try {
        const { chatId, unblockingUserId, unblockedUserId } = req.body;
        if (!chatId || !unblockingUserId || !unblockedUserId) {
            return res.status(400).send({
                status: false,
                message: "Please provide all details",
            });
        }

        const chat = await Chat.findById(chatId);

        // Remove the blockedUser entry if it exists
        chat.blockedUsers = chat.blockedUsers.filter(
            (block) =>
                !(
                    block.userId.equals(unblockedUserId) &&
                    block.blockedBy.equals(unblockingUserId)
                )
        );

        await chat.save();

        return res.status(200).json({
            status: true,
            message: "User unblocked successfully in this chat.",
        });
    } catch (error) {
        console.error("Error while unblocking user in chat:", error);

        return res.status(500).json({
            status: false,
            message: "Failed to unblock user in this chat.",
        });
    }
};

//get status of chat
exports.getBlockStatus = async (req, res) => {
    try {
        const { chatId } = req.body;
        if (!chatId) {
            return res.status(400).send({
                status: false,
                message: "Please provide all details",
            });
        }

        const chat = await Chat.findById(chatId);

        // Remove the blockedUser entry if it exists
        // chat.blockedUsers = chat.blockedUsers.filter(
        //     block => !(block.userId.equals(unblockedUserId) && block.blockedBy.equals(unblockingUserId))
        // );

        // await chat.save();

        return res.status(200).json({
            status: true,
            chat: chat,
            message: "Chat details.",
        });
    } catch (error) {
        console.error("Error while getting user chat:", error);

        return res.status(500).json({
            status: false,
            message: "Someting went wrong",
        });
    }
};

//To get total spent by user 
exports.userTransactionCountsData = async (req, res) => {
    let userId = mongoose.Types.ObjectId(req.personId);

    let conditions = {
        userId: userId,
    };

    let jobs = await Job.find(conditions);

    let totalSpent = 0;

    jobs.forEach((job) => {
        const status = job.jobStatus;
        if (status == "CO") {
            totalSpent += job.finalPrice + job.tip;
        }
    });

    totalSpent = Number(totalSpent.toPrecision(3));

    res.status(200).send({
        status: true,
        totalSpent: totalSpent,
    });
};