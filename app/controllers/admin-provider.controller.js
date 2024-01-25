const db = require("../models");
const User = db.user;
// const Provider = db.provider;
const Service = db.service;
var bcrypt = require("bcryptjs");
const Plan = db.plan;
const ProviderService = db.providerService;
const Rating = db.rating;
var nodemailer = require("nodemailer");
const getAllSettings = require("../constants/settings");
let settings = null;
(async () => {
    settings = await getAllSettings();
})();

function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000);
}

// the date format is ISO 8601
// i want to split the date at T, so i can get the date and time separately
// this is a function to accept the date and return the date in YYYY-MM-DD format
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

// make a function to count all providers with status 1
exports.countAll = (req, res) => {
    User.countDocuments({ isActive: true, userType: "provider" })
        .then((count) => {
            res.send(JSON.stringify(count));
        })
        .catch((err) => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving providers.",
            });
        });
};

exports.findAll = (req, res) => {
    const pageSize = req.body.pageSize || 1;
    const pageNumber = req.body.pageNumber || 1;
    const skip = (pageNumber - 1) * pageSize;
    const sortField = req.body.sortField || "createdAt";
    const sortOrder = req.body.sortOrder || "desc";
    const search = req.body.search || "";

    const sort = {};
    sort[sortField] = sortOrder === "asc" ? 1 : -1;

    User.find({
        $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
        ],
        userType: "provider",
    })
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .then((providers) => {
            User.countDocuments({
                $or: [
                    { firstName: { $regex: search, $options: "i" } },
                    { lastName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                ],
                userType: "provider",
            })
                .then((count) => {
                    res.send({ providers, count });
                })
                .catch((err) => {
                    res.status(500).send({
                        message:
                            err.message || "Some error occurred while retrieving providers.",
                    });
                });
        })
        .catch((err) => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving providers.",
            });
        });
};

// a find method to find certain providers by createdAt range (fromDate, toDate)
// the date format is YYYY-MM-DD HH:mm:ss
exports.findByDateRange = async (req, res) => {
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    fromDate = getFormattedDate(new Date(fromDate));
    toDate = getFormattedDate(new Date(toDate));

    fromDate = fromDate + " 00:00:00";
    toDate = toDate + " 23:59:59";

    let dayOnFromDate = new Date(fromDate);
    dayOnFromDate = dayOnFromDate.toDateString().split(" ")[0];
    let resultArr = [];

    let parsedfromDate = Date.parse(fromDate);
    let parsedEndDate = Date.parse(toDate);

    let totalTime = parsedEndDate - parsedfromDate;

    let fixedTimeGap = totalTime / 7;

    for (let i = 0; i < 7; i++) {
        let newStartDate = new Date(parsedfromDate);
        let newEndDate = new Date(parsedfromDate + fixedTimeGap);
        await User.find(
            {
                createdAt: { $gte: newStartDate.toISOString(), $lte: newEndDate.toISOString() },
                userType: "provider",
            },
            {
                _id: 1,
                createdAt: 1,
            }
        )
            .sort({ createdAt: 1 })
            .then((providers) => {
                resultArr.push({
                    value: providers.length,
                    time: newEndDate.getDate() + "/" + (+newEndDate.getMonth() + 1),
                });

                parsedfromDate += fixedTimeGap;
                // let newUsers = [];
                // for (let i = 0; i < providers.length; i++) {
                //   let dayUser = new Date(providers[i].createdAt);
                //   dayUser = dayUser.toDateString().split(" ")[0];
                //   newUsers[i] = dayUser;
                // }
                // // count how many each key is in newUsers array
                // let result = {};
                // newUsers.forEach((day) => {
                //   if (result[day]) {
                //     result[day]++;
                //   } else {
                //     result[day] = 1;
                //   }
                // });
                // const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                // const startIndex = daysOfWeek.indexOf(dayOnFromDate);
                // const newDaysOfWeek = daysOfWeek
                //   .slice(startIndex)
                //   .concat(daysOfWeek.slice(0, startIndex));
                // // transfer the values of result object to newDaysOfWeek values but don't change the keys
                // // if there is no value for a key in result object, set it to 0
                // let finalResult = {};
                // newDaysOfWeek.forEach((day) => {
                //   if (result[day]) {
                //     finalResult[day] = result[day];
                //   } else {
                //     finalResult[day] = 0;
                //   }
                // });
            })
            .catch((err) => {
                res.status(500).send({
                    message:
                        err.message || "Some error occurred while retrieving providers.",
                });
            });
    }
    setTimeout(() => {
        res.send(JSON.stringify(resultArr));
    }, 2000);
    // res.send(JSON.stringify(finalResult));
};

// Find Record by ID
exports.findById = (req, res) => {
    const id = req.body.id;

    User.find({ _id: id })
        .then((data) => {
            // console.log("data" , data)
            ProviderService.find({ userId: id })
                .populate("serviceId")
                // .populate("userId")
                .then((providerServiceData) => {
                    // console.log("providerServiceData" , providerServiceData)
                    data[0].providerService = providerServiceData;
                    res.send(
                        JSON.stringify({
                            data: data[0],
                            providerService: providerServiceData,
                        })
                    );
                    // res.send(JSON.stringify({data:data[0]}));
                })
                .catch((err) => {
                    res.status(500).send({
                        message:
                            err.message ||
                            "Some error occurred while retrieving ProviderService.",
                    });
                });
        })
        .catch((err) => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving users.",
            });
        });
};

// Delete Record by ID
exports.deleteById = (req, res) => {
    const id = req.body.id;

    User.deleteOne({ _id: id })
        .then((data) => {
            console.log(data);
            res.send(JSON.stringify(data));
        })
        .catch((err) => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving users.",
            });
        });
};

// Update Record by ID
exports.update = async (req, res) => {
    // console.log(req.body, req.files);
    if (req.files.profilePic) {
        // console.log("profile");
        req.body["profilePic"] = req.files.profilePic[0].filename;
    }
    if (req.files.businessLicense) {
        // console.log("businessLicense");
        req.body["businessLicense"] = req.files.businessLicense[0].filename;
    }
    // console.log(req.body);
    if (req.files.passportOrLicense) {
        // console.log("passportOrLicense");
        req.body["passportOrLicense"] = req.files.passportOrLicense[0].filename;
    }

    if (req.body.isApproved == 'true') {
        let providerData = await User.findById(req.body._id);
        let html = `
            <p>Dear ${providerData.firstName},</p>
            <p>Approval of your profile as a provider has been processed. You can now use  as a provider.
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
                to: providerData.email,
                subject: " - Provider Profile Approval",
                html: html,
            });
        }
    }

    let loc = {};
    if (req.body.place_id) {
        var API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        var BASE_URL =
            "https://maps.googleapis.com/maps/api/geocode/json?place_id="; // use "place_id"
        var address = req.body.place_id;
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
        req.body.loc = loc;
    }
    User.updateOne({ _id: req.body._id }, req.body)
        .then((data) => {
            // console.log(data);
            let payload = JSON.parse(req.body.services);
            payload.map((ele) => {
                if (ele._id) {
                    ProviderService.updateOne({ _id: ele._id }, ele).then((res) => { });
                } else {
                    ele["userId"] = req.body._id;
                    ProviderService.insertMany(ele).then((res) => { });
                }
            });
            res.send({ message: "Data updated" });
        })
        .catch((err) => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving users.",
            });
        });
};

// Update Record by ID
exports.create = (req, res) => {
    // console.log(req.body)
    req.body.email = req.body.email.toLowerCase();
    User.find({ email: req.body.email }).then(async (emailData) => {
        // console.log(emailData);
        if (emailData.length > 0) {
            res.status(400).send({
                status: "failure",
                message: "Email already exists.",
            });
        } else {
            let otp = generateOtp();
            req.body["otp"] = otp;

            let html = `<p>Hi ${req.body.firstName},</p>
                <p>Thanks for signing up with .</p>
                <p>Here are your credentials:</p>
                <p><strong>Email</strong>: ${req.body.email}</p>
                <p><strong>Password</strong>: ${req.body.password}</p>
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
                    to: req.body.email,
                    subject: " - Signup",
                    html: html,
                });
            }
            // console.log(req.body);
            req.body.password = bcrypt.hashSync(req.body.password, 8);
            req.body["profilePic"] = req.files.profilePic[0].filename;
            req.body["businessLicense"] = req.files.businessLicense[0].filename;
            req.body["passportOrLicense"] = req.files.passportOrLicense[0].filename;
            let loc = {};
            if (req.body.place_id) {
                var API_KEY = process.env.GOOGLE_MAPS_API_KEY;
                var BASE_URL =
                    "https://maps.googleapis.com/maps/api/geocode/json?place_id="; // use "place_id" 
                var address = req.body.place_id;
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
            }
            req.body.loc = loc;
            // console.log(req.body)
            // return;
            User.insertMany([req.body])
                .then((data) => {
                    let payload = JSON.parse(req.body.services);
                    payload.map((ele) => {
                        return (ele["userId"] = data[0]._id);
                    });
                    // console.log(payload);
                    ProviderService.insertMany(payload).then((result) => {
                        res.send({ message: "Data created" });
                    });
                    // res.send(JSON.stringify(data));
                })
                .catch((err) => {
                    res.status(500).send({
                        status: "failure",
                        message:
                            err.message || "Some error occurred while retrieving users.",
                    });
                });
        }
    });
};

exports.findAllServices = (req, res) => {
    Service.find()
        .then((result) => {
            res.status(200).send(result);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
};

exports.findAllPlans = (req, res) => {
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

// Find Record by Service ID
exports.findByserviceId = (req, res) => {
    const id = req.body._id;
    ProviderService.find({ serviceId: id })
        .populate("serviceId")
        // .populate("userId")
        .then((providerServiceData) => {
            res.send(JSON.stringify(providerServiceData));
        })
        .catch((err) => {
            res.status(500).send({
                message:
                    err.message ||
                    "Some error occurred while retrieving ProviderService.",
            });
        });
};

// Find Record by Rating ID
exports.findByRatingId = (req, res) => {
    const id = req.body.id;
    // console.log(id)
    Rating.find({ providerId: id })
        .populate("serviceId")
        // .populate("userId")
        .then((data) => {
            res.send(JSON.stringify(data));
        })
        .catch((err) => {
            res.status(500).send({
                message:
                    err.message ||
                    "Some error occurred while retrieving ProviderService.",
            });
        });
};

exports.updateRating = (req, res) => {
    // const id = req.body.id;
    // console.log(id)
    req.body.map((ele) => {
        Rating.updateOne({ _id: ele._id }, ele)
            // .populate("userId")
            .then((data) => {
                // res.send(JSON.stringify(data));
            })
            .catch((err) => {
                res.status(500).send({
                    message:
                        err.message ||
                        "Some error occurred while retrieving ProviderService.",
                });
            });
    });
    res.send({ message: "Data Update Successfully" });
};

exports.deleteService = (req, res) => {
    const data = req.body;
    data.map((ele) => {
        ProviderService.deleteOne({ _id: ele._id })
            .then((data) => {
                // console.log(data);
                // res.send(JSON.stringify(data));
            })
            .catch((err) => {
                res.status(500).send({
                    message: err.message || "Some error occurred while retrieving users.",
                });
            });
    });
    res.status(200).send({ status: true, message: "Service Deleted" });
};

exports.findAllProvider = (req, res) => {
    User.countDocuments({
        userType: "provider",
    })
        .then((providerCount) => {
            res.send(JSON.stringify(providerCount));
        })
        .catch((err) => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving provider.",
            });
        });
};

exports.getAllProvider = (req, res) => {
    User.find({
        userType: "provider",
    })
        .then((provider) => {
            res.send(JSON.stringify(provider));
        })
        .catch((err) => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving provider.",
            });
        });
};
