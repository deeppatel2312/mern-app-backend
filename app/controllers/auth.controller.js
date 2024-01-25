const config = require("../config/auth.config");
const db = require("../models");
const Admin = db.admin;
const Job = db.job;
const User = db.user;
const JobStatus = db.jobStatus;
var nodemailer = require("nodemailer");
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
require("dotenv").config();
const getAllSettings = require("../constants/settings");
let settings = null;
(async () => {
    settings = await getAllSettings();
})();

function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000);
}

// getCounts function
// get count of users from users collection
// get count of jobs from jobs collection
// get revenue using total of price of all jobs
exports.getCounts = async (req, res) => {
    try {
        const users = await User.countDocuments();
        const jobs = await Job.countDocuments();
        let revenue = await Job.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: "$price" },
                },
            },
        ]);
        // get revenue from array, if array is empty then set revenue to 0
        revenue = revenue.length > 0 ? revenue[0].total : 0;
        return res.status(200).send({ users, jobs, revenue });
    } catch (err) {
        console.log(err);
    }
};

// get all jobStatuses from the database
exports.getJobStatuses = (req, res) => {
    // console.log('job status model is ', JobStatus)
    JobStatus.find()
        .then((jobStatuses) => {
            // iterate over all jobStatuses and put their code as key and the whole object as the value
            jobStatuses = jobStatuses.reduce((acc, jobStatus) => {
                acc[jobStatus.code] = jobStatus;
                return acc;
            }, {});
            return res.status(200).send(jobStatuses);
        })
        .catch((err) => {
            console.log(err);
        });
};

exports.signup = (req, res) => {
    const admin = new Admin({
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 8),
        createdAt: new Date(),
        updatedAt: new Date(),
        otp: "",
        status: 1,
    });

    admin.save((err, admin) => {
        if (err) {
            res.status(500).send({ message: err, status: false });
            return;
        }

        res.send({ message: "Admin was registered successfully!", status: true });
    });
};

// forgot password function called forgotPassword
// get email from request body
// find admin by email
// if admin is not found then return error
// if admin is found then generate random token
// set token expiry to 1 hour
// set token to admin object
// save admin object
// send email to admin with token
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        Admin.findOne({ email }, (err, admin) => {
            if (err || !admin) {
                return res
                    .status(400)
                    .json({ error: "Admin with this email does not exist." });
            }
            const token = jwt.sign({ _id: admin._id }, config.secret, {
                expiresIn: "1h",
            });
            admin.resetPasswordToken = token;
            admin.resetPasswordExpires = Date.now() + 3600000; // 1 hour
            let otp = generateOtp();
            admin.otp = otp;

            Admin.updateOne({ _id: admin._id }, { otp: otp })
                .then((data) => {
                    console.log("data", data, admin._id, otp);
                })
                .catch((err) => {
                    console.log("error", err);
                });

            admin.save((err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                let html = `<p>Hi ${admin.name},</p>
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
                    // return res.status(200).send({ message: "OTP sent on email." });
                    const result = await transporter.sendMail({
                        from: settings.emailFrom,
                        to: admin.email,
                        subject: " - Reset your password",
                        html: html,
                    });

                    let emailResponse = result.response;
                    // check if emailResponse string contains OK
                    if (emailResponse.includes("OK")) {
                        return res.status(200).send({ message: "OTP sent on email.", status: true });
                    } else {
                        return res.status(500).send({
                            message: "Error sending email. Please try again later.",
                            status: false,
                        });
                    }
                }
            });
        });
    } catch (err) {
        console.log(err);
    }
};

exports.signin = (req, res) => {
    Admin.findOne({
        email: req.body.email,
    }).exec((err, admin) => {
        if (err) {
            res.status(500).send({ message: err, status: false, });
            return;
        }

        if (!admin) {
            return res.status(404).send({ message: "Admin Not found.", status: false, });
        }

        var passwordIsValid = bcrypt.compareSync(req.body.password, admin.password);

        if (!passwordIsValid) {
            return res.status(401).send({ message: "Invalid Credentials!", status: false, });
        }

        const token = jwt.sign({ id: admin.id }, config.secret, {
            algorithm: "HS256",
            allowInsecureKeySizes: true,
            expiresIn: 86400, // 24 hours
        });

        var authorities = [];

        req.session.token = token;

        res.status(200).send({
            id: admin._id,
            email: admin.email,
            token: token,
            status: true
        });
    });
};

exports.signout = async (req, res) => {
    try {
        req.session = null;
        return res.status(200).send({ message: "You've been signed out!", status: true });
    } catch (err) {
        this.next(err);
    }
};

// Reset Password 
exports.resetPassword = async (req, res) => {
    console.log(req.body);
    Admin.findOne({ email: req.body.email })
        .then((result) => {
            console.log(result);
            // res.send("Data Found");
            if (req.body.otp == result.otp) {
                Admin.updateOne({ _id: result._id }, { password: bcrypt.hashSync(req.body.password, 8), otp: '', resetPassword: new Date() })
                    .then((data) => {
                        res.status(200).send({ message: "Password changed successfully", status: true })
                        console.log("data", data);
                    })
                    .catch((err) => {
                        res.status(500).send({ message: "Something went erong", status: false, })
                        console.log("error", err);
                    });
            } else {
                res.status(400).send({ message: "Otp do not match", status: false, })
            }
        })
        .catch((err) => {
            console.log(err);
        });
};

// Cancel Reset Password 
exports.cancelResetPassword = async (req, res) => {
    // console.log(req.body);
    Admin.findOne({ email: req.body.email })
        .then((result) => {
            // console.log(result);
            Admin.updateOne({ _id: result._id }, { otp: "" })
                .then((data) => {
                    // console.log("data", data);
                    res.status(200).send({ message: "Password Reset Cancelled", status: true })
                })
                .catch((err) => {
                    res.status(500).send({ message: "Something went wrong", status: false, })
                    console.log("error", err);
                });
        })
        .catch((err) => {
            res.status(500).send({ message: "Something went wrong", status: false, })
            console.log(err);
        });
};

exports.validateUser = async (req, res) => {
    res.send({ message: "Verified", status: true, })
}