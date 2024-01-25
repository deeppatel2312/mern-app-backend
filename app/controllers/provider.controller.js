const db = require("../models");
var nodemailer = require("nodemailer");
var bcrypt = require("bcryptjs");
const validator = require("validator");
const ProviderService = db.providerService;
const User = db.user;
const Transaction = db.transaction;
const Subscription = db.subscription;
var jwt = require("jsonwebtoken");
require("dotenv").config();
const Service = db.service;
const Plan = db.plan;
const Job = db.job;
const BankDetail = db.bankDetail;
var mongoose = require("mongoose");
const Dispute = db.dispute;
const Tracking = db.tracking;
const ReportedReview = db.reportedReview;
const UserDevice = db.userDevice;
const Notification = db.notification;
const fs = require("fs");
const path = require("path");
const Rating = require("../models/rating.model");
const commonConstants = require("../constants/common");
const { sendPushNotification } = require("../helpers/pushNotifications");
const getAllSettings = require("../constants/settings");
let settings = null;
(async () => {
    settings = await getAllSettings();
})();

function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000);
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

function isEmpty(obj) {
    for (const prop in obj) {
        if (Object.hasOwn(obj, prop)) {
            return false;
        }
    }

    return true;
}

function getNumbersInRange(start, end) {
    if (start > end) {
        [start, end] = [end, start];
    }

    const result = [];
    for (let i = start; i <= end; i++) {
        result.push(i);
    }

    return result;
}

function mergeArrays(arrayOfArrays) {
    return [].concat.apply([], arrayOfArrays);
}

// verify the email by checking the 6 character OTP sent to the provider's email, against the OTP in the database
exports.verifyEmail = (req, res) => {
    let today = new Date();
    today = today.toISOString();
    console.log("provider verify email hit at " + today);
    // check if any field is empty and email is valid and otp is 6 characters long
    if (
        !req.body.email ||
        !req.body.otp ||
        !validator.isEmail(req.body.email) ||
        req.body.otp.length !== 4
    ) {
        res.status(400).send({ status: false, message: "Invalid email or otp." });
        return;
    }

    User.findOne({
        email: req.body.email,
    }).exec((err, provider) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        if (!provider) {
            res.status(400).send({ status: false, message: "Provider not found." });
            return;
        }

        if (provider.otp !== req.body.otp) {
            res.status(400).send({ status: false, message: "OTP is incorrect." });
            return;
        }

        provider.updatedAt = new Date().toISOString();

        provider.save((err, provider) => {
            if (err) {
                res.status(500).send({ status: false, message: err });
                return;
            }

            res
                .status(200)
                .send({ status: true, message: "Email verified successfully." });
        });
    });
};

exports.forgotPassword = async (req, res) => {
    // log the current time in dd/mm/yyyy format
    let today = new Date();
    today = today.toISOString();
    console.log("provider forgot hit at " + today);
    const { email } = req.body;
    try {
        User.findOne({ email }, (err, provider) => {
            if (err) {
                res.status(500).send({ status: false, message: err });
                return;
            }

            if (!provider) {
                res.status(400).send({ status: false, message: "Provider not found." });
                return;
            }

            let otp = generateOtp();

            provider.otp = otp;
            provider.save((err) => {
                if (err) {
                    return res.status(500).json({ status: false, error: err.message });
                }

                // this is the html for reset password email
                let html = `<p>Hi ${provider.firstName},</p>
                    <p>Here is your reset password OTP.</p>
                    <p style="font-size: 35px;"><strong>${otp}</strong></p>
                    <p>Thanks,</p>
                    <p><strong> Team</strong></p>`;

                var mail = {
                    to: email,
                    subject: " - Reset your password",
                    html: html,
                };

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
                            message: "Error sending email. Please try again.",
                        });
                    }
                }
            });
        });
    } catch (err) {
        console.log(err);
    }
};

// check if the otp is correct and send success so that provider can reset the password
exports.checkForgotOtp = async (req, res) => {
    let today = new Date();
    today = today.toISOString();
    console.log("provider check forgot hit at " + today);
    // check if any field is empty and email is valid
    if (!req.body.email || !req.body.otp || !validator.isEmail(req.body.email)) {
        res
            .status(400)
            .send({ status: false, message: "Email or OTP is invalid." });
        return;
    }

    // check if provider exists and otp is correct
    User.findOne({
        email: req.body.email,
    }).exec((err, provider) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        if (!provider) {
            res.status(400).send({ status: false, message: "Provider not found." });
            return;
        }

        if (!provider.isActive) {
            res
                .status(400)
                .send({ status: false, message: "Provider is not active." });
            return;
        }

        if (provider.otp !== req.body.otp) {
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
    let today = new Date();
    today = today.toISOString();
    console.log("provider reset password hit at " + today);
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

    // check if provider exists and password is correct
    User.findOne({
        email: req.body.email,
    }).exec((err, provider) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        if (!provider) {
            res.status(400).send({ status: false, message: "Provider not found." });
            return;
        }

        if (!provider.isActive) {
            res
                .status(400)
                .send({ status: false, message: "Provider is not active." });
            return;
        }

        // hash password
        var password = bcrypt.hashSync(req.body.password, 8);

        provider.password = password;
        // save provider object
        provider.save((err) => {
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

exports.getServiceList = async (req, res) => {
    let providerId = req.query.providerId;

    if (providerId) {
        try {
            let serviceList = await ProviderService.find(
                { userId: mongoose.Types.ObjectId(providerId), isActive: true },
                { serviceId: 1 }
            ).populate({
                path: "serviceId",
                select: "name",
            });

            const modifiedServicesArray = serviceList.map(service => ({
                _id: service.serviceId._id,
                name: service.serviceId.name
            }));

            res.send({ status: true, services: modifiedServicesArray });
        } catch (error) {
            console.log('Error while fetching service list:', error.message);

            return res.status(500).send({
                status: false,
                message: 'Error while fetching service list'
            });
        }
    } else {
        try {
            let services = await Service.find({
                isActive: true,
                name: { $ne: "Services" },
            });

            res.status(200).send({ status: true, services: services, });
        } catch (error) {
            console.log('Error while fetching service list:', error.message);

            return res.status(500).send({
                status: false,
                message: 'Error while fetching service list'
            });
        }
    }
};

exports.getPlanList = (req, res) => {
    let today = new Date();
    today = today.toISOString();
    // get all plans with isActive = true
    Plan.find({ isActive: true }, (err, plans) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        res.status(200).send({
            status: true,
            plans: plans,
        });
    });
};

// when the provider toggles the availability button, this function is called
// find the provider by id and update the isAvailable field
exports.updateAvailability = async (req, res) => {
    const { isAvailable } = req.body;
    let providerId = req.personId;

    // check if provider exists
    User.findById(providerId, (err, provider) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        if (!provider) {
            res.status(400).send({ status: false, message: "Provider not found." });
            return;
        }

        // find the provider by id and update the isAvailable field
        User.findByIdAndUpdate(
            providerId,
            {
                isAvailable: isAvailable,
                updatedAt: new Date().toISOString(),
            },
            { new: true },
            (err, provider) => {
                if (err) {
                    res.status(500).send({ status: false, message: err });
                    return;
                }

                res.status(200).send({
                    status: true,
                    message: "Availability updated successfully.",
                });
            }
        );
    });
};

exports.updateShiftTiming = async (req, res) => {
    const { startTime, endTime } = req.body;
    let providerId = req.personId;

    // check if provider exists
    User.findById(providerId, (err, provider) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        if (!provider) {
            res.status(400).send({ status: false, message: "Provider not found." });
            return;
        }

        // find the provider by id and update the isAvailable field
        User.findByIdAndUpdate(
            providerId,
            {
                shiftStartTime: startTime,
                shiftEndTime: endTime,
                updatedAt: new Date().toISOString(),
            },
            { new: true },
            (err, provider) => {
                if (err) {
                    res.status(500).send({ status: false, message: err });
                    return;
                }

                res.status(200).send({
                    status: true,
                    message: "Availability timings updated successfully.",
                });
            }
        );
    });
};

// change password function. Check if the current password entered is correct and then change the password
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    let providerId = req.personId;

    // check if any field is empty
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        res
            .status(400)
            .send({ status: false, message: "Please fill all the fields." });
        return;
    }

    // check if newPassword and confirmNewPassword match
    if (newPassword !== confirmNewPassword) {
        res.status(400).send({ status: false, message: "Passwords do not match." });
        return;
    }

    // check if currentPassword is correct
    User.findById(providerId, (err, provider) => {
        if (!provider) {
            res.status(400).send({ status: false, message: "Provider not found." });
            return;
        }

        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        // check if password is correct
        var passwordIsValid = bcrypt.compareSync(
            currentPassword,
            provider.password
        );

        if (!passwordIsValid) {
            res
                .status(400)
                .send({ status: false, message: "Current password is incorrect." });
            return;
        }

        // hash the new password
        var password = bcrypt.hashSync(newPassword, 8);

        // update the password
        User.findByIdAndUpdate(
            providerId,
            {
                password: password,
                updatedAt: new Date().toISOString(),
            },
            { new: true },
            (err, provider) => {
                if (err) {
                    res.status(500).send({ status: false, message: err });
                    return;
                }

                res.status(200).send({
                    status: true,
                    message: "Password changed successfully.",
                });
            }
        );
    });
};

// this is getProfile. We get the JWT token from the request header and decode it to get the providerId
// then we find the provider by id and send the provider object

// [
//     {
//         "id": "",
//         "value": ""
//     },
//     {
//         "id": "",
//         "value": ""
//     },
//     {
//         "id": "",
//         "value": ""
//     },
//     {
//         "id": "",
//         "value": ""
//     }
// ]

exports.getProfile = async (req, res) => {
    // find the provider by id
    User.findById(req.personId, (err, provider) => {
        if (!provider) {
            res.status(400).send({ status: false, message: "Provider not found." });
            return;
        }

        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        ProviderService.find({ userId: provider._id.toString() })
            .select("_id rate images")
            .populate("serviceId", "name")
            .exec((err, providerServices) => {
                if (err) {
                    res.status(500).send({ status: false, message: err });
                    return;
                }

                let policyText = "";
                if (provider.cancellationPolicy === 48) {
                    policyText = "Cancel before 48 hours at no charge (Strict)";
                } else if (provider.cancellationPolicy === 12) {
                    policyText = "Cancel before 12 hours at no charge (Moderate)";
                } else if (provider.cancellationPolicy === 0) {
                    policyText =
                        "Cancel anytime before the job has started at no charge (Flexible)";
                } else {
                    policyText = "";
                }

                res.status(200).send({
                    baseUrl: `${process.env.UPLOAD_PATH}`,
                    status: true,
                    provider: provider,
                    policyText: policyText,
                    services: providerServices,
                });
            });
    });
};

// exports.syncCalendar = async (req, response) => {
//     console.log('calendar api called')
//     // return
//     const fs = require("fs").promises;
//     const path = require("path");
//     const process = require("process");
//     const { authenticate } = require("@google-cloud/local-auth");
//     const { google } = require("googleapis");

//     // If modifying these scopes, delete token.json.
//     const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
//     // The file token.json stores the user's access and refresh tokens, and is
//     // created automatically when the authorization flow completes for the first
//     // time.
//     const TOKEN_PATH = path.join(process.cwd(), "token.json");
//     const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
//     // console.log(CREDENTIALS_PATH)
//     // return

//     /**
//      * Reads previously authorized credentials from the save file.
//      *
//      * @return {Promise<OAuth2Client|null>}
//      */
//     async function loadSavedCredentialsIfExist() {
//         try {
//             const content = await fs.readFile(TOKEN_PATH);
//             const credentials = JSON.parse(content);
//             return google.auth.fromJSON(credentials);
//         } catch (err) {
//             return null;
//         }
//     }

//     /**
//      * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
//      *
//      * @param {OAuth2Client} client
//      * @return {Promise<void>}
//      */
//     async function saveCredentials(client) {
//         const content = await fs.readFile(CREDENTIALS_PATH);
//         const keys = JSON.parse(content);
//         const key = keys.installed || keys.web;
//         const payload = JSON.stringify({
//             type: "authorized_user",
//             client_id: key.client_id,
//             client_secret: key.client_secret,
//             refresh_token: client.credentials.refresh_token,
//         });
//         await fs.writeFile(TOKEN_PATH, payload);
//     }

//     /**
//      * Load or request or authorization to call APIs.
//      *
//      */
//     async function authorize() {
//         let client = await loadSavedCredentialsIfExist();
//         if (client) {
//             return client;
//         }
//         client = await authenticate({
//             scopes: SCOPES,
//             keyfilePath: CREDENTIALS_PATH,
//         });
//         if (client.credentials) {
//             await saveCredentials(client);
//         }
//         return client;
//     }

//     /**
//      * Lists the next 10 events on the user's primary calendar.
//      * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
//      */
//     async function listEvents(auth) {
//         const calendar = google.calendar({ version: "v3", auth });
//         const res = await calendar.events.list({
//             calendarId: "primary",
//             timeMin: new Date().toISOString(),
//             // maxResults: 10,
//             singleEvents: true,
//             orderBy: "startTime",
//         });
//         const events = res.data.items;
//         if (!events || events.length === 0) {
//             console.log("No upcoming events found.");
//             return;
//         }
//         console.log("Upcoming events:");
//         // console.log(events)
//         let eventsData = [];
//         events.map((event, i) => {
//             const start = event.start.dateTime || event.start.date;
//             // console.log(`${start} - ${event.summary}`);
//             // const key = `event_${i}`;

//             const eventObject = {
//                 startDate: start,
//                 summary: event.summary,
//             };

//             eventsData.push(eventObject);
//         });

//         console.log(eventsData);

//         let providerId = req.personId;

//         User.findByIdAndUpdate(
//             providerId,
//             {
//                 googleCalendarEvents: eventsData,
//                 updatedAt: new Date().toISOString(),
//             },
//             { new: true },
//             (err, provider) => {
//                 if (err) {
//                     response.status(500).send({ status: false, message: err });
//                     return;
//                 }

//                 response.status(200).send({
//                     status: true,
//                     message: "Events updated successfully.",
//                 });
//             }
//         );
//     }

//     authorize().then(listEvents).catch(console.error);
// };

exports.createCalendarEvent = async (req, res) => {
    // Refer to the JavaScript quickstart on how to setup the environment:
    // https://developers.google.com/calendar/quickstart/js
    // Change the scope to 'https://www.googleapis.com/auth/calendar' and delete any
    // stored credentials.

    const event = {
        summary: "Google I/O 2015",
        start: {
            dateTime: "2015-05-28T09:00:00-07:00",
            timeZone: process.env.TIMEZONE,
        },
        end: {
            dateTime: "2015-05-28T17:00:00-07:00",
            timeZone: process.env.TIMEZONE,
        },
    };

    const request = gapi.client.calendar.events.insert({
        calendarId: "primary",
        resource: event,
    });

    request.execute(function (event) {
        appendPre("Event created: " + event.htmlLink);
    });
};

exports.jobRequestList = async (req, res) => {
    const pageNumber = req.body.pageNumber || 1; // Default to page 1 if pageNumber is not provided
    const resultsPerPage = 5; // Default to 5 results per page if not provided
    const search = req.body.search || "";
    User.find({
        $or: [
            { firstName: { $regex: search, $options: "ig" } },
            { lastName: { $regex: search, $options: "ig" } },
        ],
        userType: "user",
    })
        .then((userData) => {
            let idArr = [];
            if (userData.length > 0) {
                userData.map((ele) => {
                    idArr.push(ele._id);
                });
            }
            // console.log(idArr);

            // Job.find({
            //     $or: [
            //         { serviceName: { $regex: search, $options: "ig" } },
            //         { userId: { $in: idArr } },
            //     ],
            //     userType: "user",
            // })
            //     .then((userData) => {
            //         let idArr = [];
            //         if (userData.length > 0) {
            //             userData.map((ele) => {
            //                 idArr.push(ele._id);
            //             });
            //         }
            // console.log(idArr);

            Job.find({
                $or: [
                    { serviceName: { $regex: search, $options: "ig" } },
                    { userId: { $in: idArr } },
                ],
                requestStatus: "pending",
                providerId: mongoose.Types.ObjectId(req.personId),
            })
                .populate({
                    path: "userId",
                    select: "firstName lastName profilePic ratingUser",
                })
                // .select("serviceName jobType jobDetail startTime unitPrice calculatedPrice durationExpected")
                .sort({ updatedAt: -1 })
                .skip((pageNumber - 1) * resultsPerPage)
                .limit(resultsPerPage)
                .then((jobs) => {
                    Job.countDocuments({
                        $or: [
                            { serviceName: { $regex: search, $options: "i" } },
                            { userId: { $in: idArr } },
                        ],
                        requestStatus: "pending",
                        providerId: mongoose.Types.ObjectId(req.personId),
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
    // });
};

// for accepting or rejecting a job from provider's side
exports.changeJobStatus = async (req, res) => {
    try {
        const { jobId, requestStatus } = req.body;

        // Find the job
        const jobData = await Job.findOne({ _id: jobId });

        if (!jobData) {
            return res.status(404).send({ status: false, message: "Job not found." });
        }

        // Fetch user device information
        const userDeviceInfo = await UserDevice.find({ userId: jobData.userId });

        if (!userDeviceInfo) {
            console.log("No user devices information while updating job status")
        }

        let userInfo = await User.findOne({ _id: jobData.userId });

        // Create notification payload
        const notificationPayload = {
            title: "Job Status",
            message: `Job status ${requestStatus}`,
            userType: "user",
            userId: jobData.userId,
            type: "job",
        };

        try {
            // Save the notification
            const newNotification = new Notification(notificationPayload);
            await newNotification.save();
        } catch (notificationError) {
            console.error("Error saving notification:", notificationError);
            return res.status(500).send({
                status: false,
                message: "Error saving notification.",
            });
        }

        // Update job status
        const result = await Job.updateOne(
            { _id: jobId },
            {
                $set: {
                    requestStatus: requestStatus,
                    updatedAt: new Date().toISOString(),
                },
            }
        );

        if (result.nModified === 0) {
            return res.status(500).send({
                status: false,
                message: "Error updating job status.",
            });
        }

        // Send push notification
        if (userInfo.userNotificationJob) {
            for (const userDevices of userDeviceInfo) {
                const notificationPayload2 = {
                    ...notificationPayload,
                    fcmToken: userDevices.fcmToken,
                };

                // Send push notification
                sendPushNotification(notificationPayload2);
            }
        }
        res.status(200).send({
            status: true,
            message: "Job request status updated successfully.",
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send({
            status: false,
            message: "Internal Server Error.",
        });
    }
};

exports.allJobsList = async (req, res) => {
    const pageNumber = req.body.pageNumber || 1;
    const resultsPerPage = 5;
    const search = req.body.search || "";
    const reqStatus = req.body.requestStatus || "";

    User.find({
        $or: [
            { firstName: { $regex: search, $options: "ig" } },
            { lastName: { $regex: search, $options: "ig" } },
        ],
        userType: "user",
    }).then((userData) => {
        let idArr = [];
        if (userData.length > 0) {
            userData.map((ele) => {
                idArr.push(ele._id);
            });
        }

        Job.find({
            $or: [
                { serviceName: { $regex: search, $options: "ig" } },
                { userId: { $in: idArr } },
            ],
            userType: "user",
        })
            .then((userData) => {
                let idArr = [];
                if (userData.length > 0) {
                    userData.map((ele) => {
                        idArr.push(ele._id);
                    });
                }

                let jobConditions = {
                    $or: [
                        { serviceName: { $regex: search, $options: "ig" } },
                        { userId: { $in: idArr } },
                    ],
                    providerId: mongoose.Types.ObjectId(req.personId),
                };

                if (reqStatus) {
                    jobConditions.requestStatus = reqStatus;
                } else {
                    jobConditions.$or = [
                        { requestStatus: "accepted" },
                        { requestStatus: "rejected" },
                    ];
                }

                Job.find(jobConditions)
                    .populate({
                        path: "userId",
                        select: "firstName lastName profilePic ratingUser",
                    })
                    // .select("serviceName requestStatus jobDetail startTime unitPrice calculatedPrice durationExpected isQuoteSent jobType")
                    .sort({ updatedAt: -1 })
                    .skip((pageNumber - 1) * resultsPerPage)
                    .limit(resultsPerPage)
                    .then((jobs) => {
                        let jobCountConditions = {
                            $or: [
                                { serviceName: { $regex: search, $options: "i" } },
                                { userId: { $in: idArr } },
                            ],
                            providerId: mongoose.Types.ObjectId(req.personId),
                        };

                        if (reqStatus) {
                            jobCountConditions.requestStatus = reqStatus;
                        } else {
                            jobCountConditions.$or = [
                                { requestStatus: "accepted" },
                                { requestStatus: "rejected" },
                            ];
                        }

                        Job.countDocuments(jobCountConditions).then((count) => {
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
    });
};

// Find Record by ID
exports.findJobById = async (req, res) => {
    const id = mongoose.Types.ObjectId(req.body.id);

    let data = await Job.find({ _id: id })
        .populate("providerId")
        .populate("userId")
        .populate("serviceId");
    let trackingData = await Tracking.findOne({ jobId: id });

    let latestTrackingStatus = "";
    let latestTrackingData = {
        otw: "",
        inTransit: "",
        delivered: "",
    };

    if (trackingData) {
        if (trackingData.delivered) {
            latestTrackingStatus = "delivered";
            latestTrackingData.delivered = trackingData.delivered;
            latestTrackingData.inTransit = trackingData.inTransit;
            latestTrackingData.otw = trackingData.otw;
        } else if (trackingData.inTransit) {
            latestTrackingStatus = "inTransit";
            latestTrackingData.inTransit = trackingData.inTransit;
            latestTrackingData.otw = trackingData.otw;
        } else if (trackingData.otw) {
            latestTrackingStatus = "otw";
            latestTrackingData.otw = trackingData.otw;
        } else {
            latestTrackingStatus = "";
        }
    }

    res.status(200).send({
        status: true,
        latestTrackingStatus: latestTrackingStatus,
        latestTrackingData: latestTrackingData,
        jobData: data,
    });
};

exports.uploadSelfie = (req, res) => {
    if (isEmpty(req.files)) {
        res.status(400).send({
            status: false,
            reqBody: req.body,
            reqFiles: req.files,
            message: "No image found.",
        });

        return;
    }

    if (req.files.startSelfie) {
        req.body["startSelfie"] = req.files.startSelfie[0].filename;
    }
    if (req.files.endSelfie) {
        req.body["endSelfie"] = req.files.endSelfie[0].filename;
    }
    if (req.files.startSelfie && req.files.endSelfie) {
        res.status(400).send({
            status: false,
            message: "Both images can't be uploaded at the same time.",
        });

        return;
    }

    let newJobId = req.body.jobId;

    delete req.body.jobId;

    req.body.updatedAt = new Date().toISOString();

    Job.findByIdAndUpdate(mongoose.Types.ObjectId(newJobId), req.body)
        .then((data) => {
            res.status(200).send({
                status: true,
                reqBody: req.body,
                reqFiles: req.files,
                message: "Selfie uploaded successfully!",
            });
        })
        .catch((err) => {
            res.status(500).send({
                status: false,
                message: err.message || "Some error occurred while updating job.",
            });
        });
};

exports.myJobsList = async (req, res) => {
    const resultsPerPage = 5;
    let { pageNumber, jobStatus } = req.body;

    const skip = (pageNumber - 1) * resultsPerPage;
    const sortField = req.body.sortField || "updatedAt";
    const sortOrder = req.body.sortOrder || "desc";
    const search = req.body.search || "";

    const sort = {};
    sort[sortField] = sortOrder === "asc" ? 1 : -1;

    let conditions = {
        providerId: mongoose.Types.ObjectId(req.personId),
    };

    if (search) {
        let userData = await User.find({
            $or: [
                { firstName: { $regex: search, $options: "ig" } },
                { lastName: { $regex: search, $options: "ig" } },
            ],
            userType: "user",
            isActive: true,
        });

        let idArr = [];
        if (userData.length > 0) {
            userData.map((ele) => {
                idArr.push(ele._id);
            });
        }

        conditions.$or = [];
        conditions.$or.push({ serviceName: { $regex: search, $options: "ig" } });

        if (idArr.length > 0) {
            conditions.$or.push({ userId: { $in: idArr } });
        }
    }

    if (jobStatus == "UPCOMING") {
        conditions.jobStatus = { $in: ["UP", "ON"] };
    } else if (jobStatus == "PAST") {
        conditions.jobStatus = { $in: ["CO", "CN"] };
    } else {
        conditions.jobStatus = jobStatus;
    }

    let jobsList = await Job.find(conditions)
        .populate("userId")
        .populate("serviceId")
        .populate("providerId")
        .sort(sort)
        .skip(skip)
        .limit(resultsPerPage);

    let countData = await Job.countDocuments(conditions);

    let jobRequestCount = await Job.countDocuments({
        requestStatus: "pending",
        providerId: mongoose.Types.ObjectId(req.personId),
    });

    let allTypeJob = await Job.find({
        providerId: mongoose.Types.ObjectId(req.personId),
    });

    let jobCounts = {
        CO: 0,
        CN: 0,
        UP: 0,
        ON: 0,
    };

    allTypeJob.map((ele) => {
        if (ele.jobStatus == "UP") {
            jobCounts.UP += 1;
        } else if (ele.jobStatus == "CO") {
            jobCounts.CO += 1;
        } else if (ele.jobStatus == "ON") {
            jobCounts.ON += 1;
        } else if (ele.jobStatus == "CN") {
            jobCounts.CN += 1;
        }
    });

    res.status(200).send({
        status: true,
        totalPages: Math.ceil(countData / resultsPerPage),
        jobRequestCount: jobRequestCount,
        jobs: jobsList,
        jobCounts: jobCounts,
    });
};

exports.updateProfile = (req, res) => {
    let today = new Date();
    today = today.toISOString();
    console.log("provider update profile hit at " + today);
    const { name, email, services, phone, bio, cancellationPolicy } = req.body;
    let providerId = req.personId;

    if (
        !commonConstants.CANCELLATION_POLICY_DURATION.includes(
            Number(cancellationPolicy)
        )
    ) {
        res.status(400).send({
            status: false,
            message: "Invalid value for cancellation policy.",
        });

        return;
    }

    // let updatedServices = '';
    // if (services) {
    //     updatedServices = JSON.parse(services);
    // }

    // console.log("providerId is ", providerId);

    let nameArray = name.split(" ");
    let firstName = name.split(" ")[0];
    // lastName will be the last word
    let lastName = "";
    if (nameArray.length > 1) {
        lastName = name.split(" ").pop();
    }

    // check if this email is already registered
    User.findOne({
        _id: { $ne: providerId },
    }).exec(async (err, provider) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        let updatedData = {
            firstName: firstName,
            lastName: lastName,
            updatedAt: new Date().toISOString(),
            phone: phone,
            bio: bio,
            cancellationPolicy: cancellationPolicy,
        };

        let loc = {};
        if (req.body.location) {
            var API_KEY = process.env.GOOGLE_MAPS_API_KEY;
            var BASE_URL =
                "https://maps.googleapis.com/maps/api/geocode/json?address="; // use "address" if you don't have place_id and vice versa
            var address = req.body.location;
            var url = BASE_URL + address + "&key=" + API_KEY;

            const fetch = require("node-fetch");
            const resultFetch = await fetch(url);
            const users = await resultFetch.json();

            if (users.results.length == 0) {
                res.status(500).send({
                    status: false,
                    message: "Failed to update location data. Please try again.",
                });

                return;
            }

            let location = JSON.stringify(users.results[0].geometry.location);

            geoData = JSON.parse(location);
            let latitude = geoData.lat;
            let longitude = geoData.lng;

            loc = {
                type: "Point",
                coordinates: [latitude, longitude],
            };

            if (!isEmpty(loc)) {
                updatedData.loc = loc;
                updatedData.location = req.body.location;
            }
        }

        // find the provider by id and update the fields
        User.findByIdAndUpdate(
            providerId,
            updatedData,
            { new: true },
            (err, s2) => {
                if (err) {
                    res.status(500).send({ status: false, message: err });
                    return;
                }

                if (!s2) {
                    res
                        .status(404)
                        .send({ status: false, message: "Provider not found." });
                    return;
                }

                let originalProfilePic = s2.profilePic;

                if (services) {
                    let serviceArray = JSON.parse(services);

                    serviceArray.forEach(async (service) => {
                        if (!service._id) {
                            // insert new
                            let newServiceData = new ProviderService({
                                userId: providerId,
                                serviceId: mongoose.Types.ObjectId(service.serviceId),
                                rate: service.rate,
                                images: service.images,
                            });

                            await newServiceData.save();
                        } else {
                            let updatedServiceData = {
                                serviceId: mongoose.Types.ObjectId(service.serviceId),
                                rate: service.rate,
                                images: service.images,
                                updatedAt: new Date().toISOString(),
                            };

                            await ProviderService.findByIdAndUpdate(
                                service._id,
                                updatedServiceData,
                                { new: true }
                            );
                        }
                    });
                }

                if (undefined !== req.files.profilePic && req.files.profilePic) {
                    profilePic = req.files.profilePic[0].filename;

                    // update the profilePic field
                    User.findByIdAndUpdate(
                        providerId,
                        {
                            profilePic: profilePic,
                        },
                        { new: true },
                        (err, s3) => {
                            if (err) {
                                res.status(500).send({ status: false, message: err });
                                return;
                            }

                            if (!s3) {
                                res
                                    .status(404)
                                    .send({ status: false, message: "Provider not found." });
                                return;
                            }

                            // send the updated provider object
                            res.status(200).send({
                                status: true,
                                email: email,
                                profilePic: profilePic,
                                baseUrl: process.env.UPLOAD_PATH,
                                message: "Profile updated successfully.",
                            });
                        }
                    );
                } else {
                    res.status(200).send({
                        status: true,
                        email: email,
                        profilePic: originalProfilePic,
                        baseUrl: process.env.UPLOAD_PATH,
                        message: "Profile updated successfully.",
                    });
                }
            }
        );
    });
};

exports.raiseDispute = (req, res) => {
    let providerId = req.personId;
    let { userId, serviceId, serviceName, description } = req.body;

    const picture = req.files.picture?.[0]?.filename || "";

    if (!picture) {
        res
            .status(400)
            .send({ status: false, message: "Please upload picture for dispute." });
        return;
    }

    dispute = new Dispute({
        userId: userId,
        providerId: providerId,
        serviceId: serviceId,
        serviceName: serviceName,
        picture: picture,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        disputeStatus: "raised",
        description: description,
    });

    dispute.save((err, dispute) => {
        if (err) {
            res.status(500).send({ status: false, message: err });
            return;
        }

        res.status(200).send({
            status: true,
            picture: picture,
            description: description,
            message: "Dispute created successfully!",
        });
    });
};

exports.dashboardCountsData = async (req, res) => {
    let providerId = mongoose.Types.ObjectId(req.personId);
    let { startDate, endDate, timePeriod, serviceId } = req.body;
    if (startDate && endDate) {
        startDate = new Date(startDate).toISOString();
        endDate = new Date(endDate).toISOString();
    }

    const currentDate = new Date();

    if (timePeriod) {
        switch (timePeriod) {
            case "1 week":
                startDate = new Date(currentDate);
                startDate.setDate(currentDate.getDate() - 6);
                break;
            case "1 month":
                startDate = new Date(currentDate);
                startDate.setMonth(currentDate.getMonth() - 1);
                break;
            case "3 months":
                startDate = new Date(currentDate);
                startDate.setMonth(currentDate.getMonth() - 3);
                break;
            case "6 months":
                startDate = new Date(currentDate);
                startDate.setMonth(currentDate.getMonth() - 6);
                break;
            case "1 year":
                startDate = new Date(currentDate);
                startDate.setFullYear(currentDate.getFullYear() - 1);
                break;
            default:
                res.status(400).send({
                    status: false,
                    message: "Invalid time period",
                });
        }
        startDate = startDate.toISOString();
        endDate = new Date().toISOString();
    }

    let conditions = {
        providerId: providerId,
    };
    if (startDate && endDate) {
        conditions.createdAt = { $gte: startDate, $lte: endDate };
    }
    if (serviceId) {
        conditions.serviceId = mongoose.Types.ObjectId(serviceId);
    }

    let jobs = await Job.find(conditions);

    const statusCounts = {};
    let revenue = 0;

    jobs.forEach((job) => {
        const status = job.jobStatus;
        if (status == "CO") {
            revenue += job.finalPrice * ((100 - settings.commissionPercentage) / 100); //remove commision % to get revenue for provider
        }

        if (status !== null && status !== undefined) {
            if (!statusCounts[status]) {
                statusCounts[status] = 1;
            } else {
                statusCounts[status]++;
            }
        }
    });

    revenue = Number(revenue.toPrecision(3));

    res.status(200).send({
        status: true,
        revenue: revenue,
        statusCounts: statusCounts,
    });
};

exports.dashboardProjectsData = async (req, res) => {
    // We send monthly data only.
    // In time graph, x axis has project names and y axis has time on each project
    // In earning graph, x axis has project names and y axis has earning on each project. Duh.

    let { graphDate, graphType } = req.body;
    let startDate = graphDate + "-01";
    startDate = new Date(graphDate);
    let year = startDate.getFullYear();
    let month = startDate.getMonth();
    let lastDay = new Date(year, month + 1, 0).getDate();
    let endDate = new Date(graphDate + "-" + lastDay);
    startDate = startDate.toISOString();
    endDate = endDate.toISOString();

    let conditions = {
        jobStatus: "CO",
        providerId: mongoose.Types.ObjectId(req.personId),
    };

    let selectFields = "";
    if (graphType == "time") {
        selectFields = "serviceName startTime endTime";
    } else if (graphType == "earnings") {
        selectFields = "serviceName finalPrice";
    } else {
        res.status(500).send({
            status: false,
            message: "Invalid graph type!",
        });
    }

    if (graphType == "time") {
        conditions.startTime = new RegExp(graphDate, "i");
    }
    if (graphType == "earnings") {
        conditions.endTime = new RegExp(graphDate, "i");
    }

    let jobs = await Job.find(conditions).select(selectFields);
    let dataX = [];
    let dataY = [];

    jobs.forEach((job) => {
        let yData = 0;

        if (graphType == "time") {
            const startTimestamp = Math.floor(
                new Date(job.startTime).getTime() / 1000
            );
            const endTimestamp = Math.floor(new Date(job.endTime).getTime() / 1000);
            const timeInHours = Math.ceil((endTimestamp - startTimestamp) / 3600);
            yData = timeInHours;
        } else {
            yData = job.finalPrice * ((100 - settings.commissionPercentage) / 100);
        }

        const serviceName = job.serviceName;
        const index = dataX.indexOf(serviceName);

        if (index !== -1) {
            dataY[index] += yData;
        } else {
            dataX.push(serviceName);
            dataY.push(yData);
        }
    });

    res.status(200).send({
        statue: true,
        dataX: dataX,
        dataY: dataY,
    });
};

exports.reviewSummery = async (req, res) => {
    console.log("reviewSummery");
    const userId = mongoose.Types.ObjectId(req.personId);
    console.log(userId, "userId");

    ProviderService.find({ userId: userId })
        .populate({ path: "serviceId" })
        .exec((err, populatedUser) => {
            if (err) {
                console.error(err);
            } else {
                const totalServices = populatedUser.length;

                // Count each service
                const serviceCounts = {};
                populatedUser.forEach((item) => {
                    const serviceName = item.serviceId.name;
                    serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
                });

                const serviceData = {
                    services: [],
                    counts: [],
                    percentages: [],
                };

                Object.keys(serviceCounts).forEach((serviceName) => {
                    const count = serviceCounts[serviceName];
                    const percentage = (count / totalServices) * 100;

                    serviceData.services.push(serviceName);
                    serviceData.counts.push(count);
                    serviceData.percentages.push(percentage.toFixed(2) + "%");
                });

                res.send({
                    status: true,
                    data: {
                        totalServices: totalServices,
                        serviceData: serviceData,
                        // reviews: populatedUser,
                    },
                });
            }
        });
};

exports.jobSummery = async (req, res) => {
    console.log("service summary", req.personId);
    let conditions = {
        providerId: req.personId,
    };
    let jobs = await Job.find(conditions);
    const statusCounts = {};
    const totalCount = jobs.length;

    jobs.forEach((job) => {
        const status = job.jobStatus;
        if (status !== null && status !== undefined) {
            if (!statusCounts[status]) {
                statusCounts[status] = 1;
            } else {
                statusCounts[status]++;
            }
        }
    });

    const statusPercentages = {};
    const statusTotals = {};

    const labels = [];
    const percentages = [];

    for (const [status, count] of Object.entries(statusCounts)) {
        const percentage = (count / totalCount) * 100;
        labels.push(status);
        percentages.push(parseFloat(percentage.toFixed(2))); // Adjust the decimal places as needed
    }

    res.status(200).send({
        status: true,
        labels,
        percentages,
    });
};

exports.serviceImageUpload = (req, res) => {
    if (!req.files || !req.files.serviceImages) {
        res.status(404).send({
            statue: false,
            message: "Please upload at least 1 image.",
        });
    }

    const serviceImages = req.files.serviceImages;

    let imageNameArr = [];

    serviceImages.forEach((image) => {
        imageNameArr.push(image.filename);
    });

    console.log(imageNameArr);

    res.status(200).send({
        status: true,
        uploadedImages: imageNameArr,
    });
};

exports.serviceImageRemove = (req, res) => {
    let { imageNames } = req.body;

    // Assuming images are in the public folder
    const publicFolderPath = path.join(__dirname, "../../public/");

    let errorDelete = false;
    let errorExist = false;

    // Loop through the array and delete each image file
    imageNames.forEach((imageName) => {
        const imagePath = publicFolderPath + imageName;

        if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (err) => {
                if (err) {
                    errorDelete = true;
                }
            });
        } else {
            errorExist = true;
        }
    });

    if (errorExist) {
        res.status(404).send({
            status: false,
            message: `File does not exist.`,
        });
    }

    if (errorDelete) {
        res.status(404).send({
            status: false,
            message: `Error deleting files.`,
        });
    }

    res.status(200).send({
        statue: true,
        message: "File(s) deleted successfully!",
    });
};

exports.providerAvailability = async (req, res) => {
    if (!req.body.date && !req.body.timezoneOffset) {
        res.send({
            message: "Please provide date and timezone offset",
            status: false,
        });
        return;
    }
    if (!req.body.providerId) {
        res.send({
            message: "Please provide provider Id",
            status: false,
        });
        return;
    }
    let dateTimeString = req.body.date;
    let timezoneOffset = Number(req.body.timezoneOffset);
    let dateTimeParts = dateTimeString.split("T");
    let datePart = dateTimeParts[0];

    let userData = await User.findOne({
        _id: req.body.providerId,
        isActive: true,
    });

    let firstStringPoint = userData.shiftStartTime;
    let secondStringPoint = userData.shiftEndTime;
    if (firstStringPoint < 10) {
        firstStringPoint = "0" + firstStringPoint;
    }
    if (secondStringPoint < 10) {
        secondStringPoint = "0" + secondStringPoint;
    }

    let data = await Job.find({
        providerId: req.body.providerId,
        startTime: new RegExp(datePart, "i"),
        $or: [{ endTime: new RegExp(datePart, "i") }, { endTime: null }],
    });

    let resultResp = {};
    let currentHour = new Date().getHours();
    const currentDate = new Date().toISOString().toString().split("T")[0];

    if (new Date().getTimezoneOffset() == 0) {
        currentHour = new Date(
            new Date().getTime() - timezoneOffset * 60 * 1000
        ).getHours();
    }

    for (let i = 0; i < 24; i++) {
        let time = i;
        if (time < 10) {
            time = "0" + time + ":00";
        } else {
            time = time + ":00";
        }
        if (
            (datePart == currentDate && i <= currentHour) ||
            i < userData.shiftStartTime ||
            i >= userData.shiftEndTime ||
            !userData.isAvailable
        ) {
            resultResp[time] = 0;
        } else {
            resultResp[time] = 1;
        }
    }

    for (let i = 0; i < data.length; i++) {
        let startDateObject = new Date(data[i].startTime);
        let endDateObject;

        if (
            undefined === data[i].endTime ||
            null === data[i].endTime ||
            !data[i].endTime
        ) {
            endDateObject = new Date(data[i].startTime);
            endDateObject.setHours(startDateObject.getHours() + 1);
        } else {
            endDateObject = new Date(data[i].endTime);
        }

        let startDateUpdated = new Date(
            startDateObject.setMinutes(startDateObject.getMinutes() - timezoneOffset)
        );
        let endDateUpdated = new Date(
            endDateObject.setMinutes(endDateObject.getMinutes() - timezoneOffset)
        );

        let finalStartDate = startDateUpdated.toISOString();
        let finalEndDate = endDateUpdated.toISOString();

        let startHour = parseInt(
            finalStartDate.toString().split("T")[1].slice(0, 2)
        );
        let endHour = parseInt(finalEndDate.toString().split("T")[1].slice(0, 2));
        let endMinute = parseInt(finalEndDate.toString().split("T")[1].slice(3, 5));

        /* 
                To, 
                    whoever is about to debug why 10 minutes is showing 1 hour in this API,
    
                This is happening because of the below if-statement.
                The duration of 1 hour and 1 minutes becomes 2 hours and 0 hours and 1 minutes becomes 1 hour and so on... (likely will happen in moving/delivery)
                This will create an issue sometimes because even if we're only 1 minutes up from an hour, it'll add a whole hour to the task.
                We need this for the tasks less than an hour to show occupied in the time slot.
                e.g., 7:00 - 7:10 This task is only 10 minutes long but if we don't add 1 hour to the end hour, "7:00" slot won't show booked.
                There was no other way (as of now), because we're only considering hourly time slots.
            */
        if (endMinute > 0) {
            endHour++;
        }

        let jobStatus = data[i].jobStatus;

        for (let j = startHour; j < endHour; j++) {
            if (j >= 0 && j < 24) {
                let time = j;
                if (time < 10) {
                    time = "0" + time + ":00";
                } else {
                    time = time + ":00";
                }
                resultResp[time] = 2;

                if (jobStatus == "CN") {
                    resultResp[time] = 1;
                }
            }
        }
    }

    res.status(200).send({
        status: true,
        data: resultResp,
    });
};

exports.getProviderServicesList = async (req, res) => {
    let serviceList = await ProviderService.find(
        { userId: mongoose.Types.ObjectId(req.body.providerId), isActive: true },
        { serviceId: 1 }
    ).populate({
        path: "serviceId",
        select: "name",
    });

    res.send(serviceList);
};

exports.reportReview = async (req, res) => {
    let report = new ReportedReview({
        providerId: req.personId,
        ...req.body,
    });

    await report.save();

    await Rating.findByIdAndUpdate(mongoose.Types.ObjectId(req.body.reviewId), {
        isReported: true,
    });

    res.status(200).send({
        status: true,
        message: "Review reported.",
    });
};

exports.updateTrackingStatus = async (req, res) => {
    if (!req.body.jobId) {
        res.status(400).send({
            status: false,
            message: "Job ID is required.",
        });

        return;
    }

    if (req.body.inTransit || req.body.otw || req.body.delivered) {
        let existingData = await Tracking.findOne({
            jobId: mongoose.Types.ObjectId(req.body.jobId),
        });

        if (existingData === null) {
            if (req.body.inTransit || req.body.delivered) {
                res.status(400).send({
                    status: false,
                    message: "This status can't be selected.",
                });

                return;
            }

            let trackingData = new Tracking({
                ...req.body,
            });

            let jobId = req.body.jobId;
            delete req.body.jobId;
            const remainingKey = Object.keys(req.body)[0];

            await trackingData.save();
            await Job.updateOne({ _id: jobId }, { trackingStatus: remainingKey });
        } else {
            if (
                (existingData.inTransit && req.body.otw) ||
                (existingData.inTransit && (req.body.inTransit || req.body.otw)) ||
                (existingData.delivered &&
                    (req.body.delivered || req.body.inTransit || req.body.otw)) ||
                (req.body.delivered && !existingData.inTransit)
            ) {
                res.status(400).send({
                    status: false,
                    message: "This status can't be selected.",
                });

                return;
            }

            await Tracking.updateOne({ jobId: req.body.jobId }, req.body);

            let jobId = req.body.jobId;
            delete req.body.jobId;
            const remainingKey = Object.keys(req.body)[0];

            await Job.updateOne({ _id: jobId }, { trackingStatus: remainingKey });
        }

        //for sending push notifications
        try {
            let exists = await Job.findById(req.body.jobId);

            const userDeviceInfo = await UserDevice.find({
                userId: exists.userId,
            });
            if (!userDeviceInfo) {
                console.log("No user devices information while updating trucking job status")
            }
            let userInfo = await User.findOne({ _id: exists.userId });

            const notificationPayload = {
                title: "Job status change",
                message: "Trucking Job status changed",
                userType: "user",
                providerId: exists.userId,
                type: "job",
            };
            // Save the notification
            const newNotification = new Notification(notificationPayload);
            await newNotification.save();
            if (userInfo.userNotificationJob) {
                for (const userDevices of userDeviceInfo) {
                    const notificationPayload2 = {
                        ...notificationPayload,
                        fcmToken: userDevices.fcmToken,
                    };

                    // Send push notification
                    sendPushNotification(notificationPayload2);
                }
            }
        } catch (error) {
            console.log("Error", error);
        }

        res.status(200).send({
            status: true,
            message: "Tracking data updated successfully.",
        });
    } else {
        res.status(400).send({
            status: false,
            message: "Invalid tracking status.",
        });
    }
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
        providerId: mongoose.Types.ObjectId(req.personId),
        isReported: false,
        isActiveForProvider: true,
    };

    let ratings = await Rating.find(conditions)
        .sort({ updatedAt: -1 })
        .populate("userId")
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

exports.purchaseSubscription = async (req, res) => {
    let discountedPrice, transactionAmount, discountAmount;

    try {
        let planData = await Plan.findOne({
            promoCode: req.body.promoCode,
            isActive: true,
        });

        if (null === planData) {
            return res.status(400).send({
                status: true,
                message: "Invalid Promo code",
            });
        }

        try {
            let existingSubscriptionData = await Subscription.findOne({
                providerId: req.personId,
            });

            if (null !== existingSubscriptionData) {
                return res.status(400).send({
                    status: false,
                    message: "Already purchased subscription",
                });
            }
        } catch (error) {
            console.log("Error while fetching existing subscription data: ", error);

            return res.status(500).send({
                status: false,
                message: "Internal error occurred",
            });
        }

        let planDiscountPercentage = planData.discount;
        let planPrice = planData.price;
        let planId = planData._id;
        let planDuration = planData.duration; // in days

        if (req.body.promoCode) {
            if (planDiscountPercentage > 0 && planPrice > 0) {
                discountedPrice =
                    Number(planPrice) * (1 - Number(planDiscountPercentage) / 100);
                discountedPrice = discountedPrice.toFixed(2);
            }

            if (discountedPrice >= 0) {
                transactionAmount = discountedPrice;
                discountAmount = planPrice - discountedPrice;
            } else {
                transactionAmount = "";
            }
        }

        let today = new Date();
        let planEndDate = today.setDate(today.getDate() + Number(planDuration));
        planEndDate = new Date(planEndDate).toISOString();

        try {
            let newTransaction = new Transaction({
                transactionId: "TESTSUB123456", // we'll get this dynamically from payment gateway later,
                finalAmount: transactionAmount,
                personId: req.personId,
                userType: "provider",
                transactionType: "sub",
            });

            await newTransaction.save();

            let newSubscription = new Subscription({
                transactionId: "TESTSUB123456", // we'll get this dynamically from payment gateway later,
                amount: transactionAmount,
                providerId: req.personId,
                planId: planId,
                endDate: planEndDate,
                discount: discountAmount,
            });

            await newSubscription.save();

            return res.status(200).send({
                status: true,
                isSubscribed: true,
                message: "Subscription purchased successfully.",
            });
        } catch (err) {
            console.log("Error while saving subscription data: ", err);

            return res.status(500).send({
                status: false,
                message: "Error while saving subscription data.",
            });
        }
    } catch (error) {
        console.log("Error while fetching plan data: ", error.message);

        return res.status(500).send({
            status: false,
            message: "Internal error occurred",
        });
    }
};

exports.checkPromoCode = async (req, res) => {
    try {
        let planData = await Plan.findOne({
            _id: mongoose.Types.ObjectId(req.body.planId),
            promoCode: req.body.promoCode,
            isActive: true,
        });

        if (planData === null) {
            return res.status(400).send({
                status: false,
                message: "Invalid promo code",
            });
        } else {
            return res.status(200).send({
                status: true,
                message: "Valid promo code",
            });
        }
    } catch (error) {
        console.log("Error while fetching plan data: ", error.message);

        return res.status(500).send({
            status: false,
            message: "Internal error while fetching plan data",
        });
    }
};

exports.addBankDetail = async (req, res) => {
    try {
        req.body.personId = req.personId;
        let newDetails = new BankDetail(req.body);
        await newDetails.save();

        return res.status(200).send({
            status: true,
            message: "Bank details saved successfully.",
        });
    } catch (err) {
        console.log("Error while saving bank details: ", err);

        return res.status(500).send({
            status: false,
            message: "Error while saving bank details.",
        });
    }
};

exports.updateBankDetail = async (req, res) => {
    try {
        await BankDetail.updateOne(
            { personId: mongoose.Types.ObjectId(req.personId) },
            req.body
        );

        return res.status(200).send({
            status: true,
            message: "Bank details updated successfully.",
        });
    } catch (err) {
        console.log("Error while updating bank details: ", err);

        return res.status(500).send({
            status: false,
            message: "Error while updating bank details.",
        });
    }
};

exports.updateNotificationSettings = async (req, res) => {
    try {
        await User.updateOne(
            { _id: mongoose.Types.ObjectId(req.personId) },
            req.body
        );

        return res.status(200).send({
            status: true,
            message: "Notification preferences updated successfully.",
        });
    } catch (err) {
        console.log("Error while updating notification preferences: ", err);

        return res.status(500).send({
            status: false,
            message: "Error while updating notification preferences.",
        });
    }
};

exports.getNotificationSettings = async (req, res) => {
    try {
        if (!req.body.userType) {
            return res.status(400).send({
                status: false,
                message: "User type is required",
            });
        }
        const userInfo = await User.findOne({
            _id: mongoose.Types.ObjectId(req.personId),
            userType: req.body.userType,
        });

        if (!userInfo) {
            return res.status(400).send({
                status: false,
                message: "User not found",
            });
        }
        let response;
        if (req.body.userType === "user") {
            response = {
                userNotificationJob: userInfo.userNotificationJob,
                userNotificationRating: userInfo.userNotificationRating,
                userNotificationChat: userInfo.userNotificationChat,
                userNotificationPayment: userInfo.userNotificationPayment,
            };
        } else {
            response = {
                providerNotificationJob: userInfo.providerNotificationJob,
                providerNotificationRating: userInfo.providerNotificationRating,
                providerNotificationChat: userInfo.providerNotificationChat,
                providerNotificationPayment: userInfo.providerNotificationPayment,
            };
        }

        return res.status(200).send({
            status: true,
            message: "Notification preferences retrieved successfully.",
            data: response,
        });
    } catch (err) {
        console.log("Error while getting notification preferences: ", err);

        return res.status(500).send({
            status: false,
            message: "Error while getting notification preferences.",
        });
    }
};

exports.checkSubscriptionStatus = async (req, res) => {
    try {
        let isSubscribed = false;

        let subscriptionData = await Subscription.findOne({
            providerId: mongoose.Types.ObjectId(req.personId),
        });

        if (subscriptionData !== null) {
            isSubscribed = true;
        }

        return res.status(200).send({
            status: true,
            isSubscribed: isSubscribed,
        });
    } catch (err) {
        console.log("Error while fetching subscription data: ", err);

        return res.status(500).send({
            status: false,
            message: "Error while fetching subscription data",
        });
    }
};

exports.ongoingTruckingJobsList = async (req, res) => {
    try {
        let jobs = await Job.find({
            jobStatus: "ON",
            $or: [{ jobType: "moving" }, { jobType: "delivery" }],
            providerId: mongoose.Types.ObjectId(req.personId),
        });

        let jobIds = jobs.map((job) => job._id);

        return res.status(200).send({
            status: true,
            jobIds: jobIds,
        });
    } catch (error) {
        console.log("Error while fetching ongoing trucking jobs:", error);

        return res.status(500).send({
            status: false,
            message: "Internal error occurred",
        });
    }
};

//Get total revenue, toal job revenue and tip amount for provider
exports.transactionCountsData = async (req, res) => {
    let providerId = mongoose.Types.ObjectId(req.personId);

    let conditions = {
        providerId: providerId,
    };

    let jobs = await Job.find(conditions);

    let revenue = 0;
    let jobsRevenue = 0;
    let tipRevenue = 0;

    jobs.forEach((job) => {
        const status = job.jobStatus;
        if (status == "CO") {
            revenue += (job.finalPrice * ((100 - settings.commissionPercentage) / 100)) + job.tip;
            jobsRevenue += job.finalPrice * ((100 - settings.commissionPercentage) / 100);
            tipRevenue += job.tip;
        }
    });

    revenue = Number(revenue.toPrecision(3));
    jobsRevenue = Number(jobsRevenue.toPrecision(3));
    tipRevenue = Number(tipRevenue.toPrecision(3));

    res.status(200).send({
        status: true,
        revenue: revenue,
        jobsRevenue: jobsRevenue,
        tipRevenue: tipRevenue,
    });
};
