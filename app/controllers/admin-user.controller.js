const db = require("../models");
const User = db.user;
var bcrypt = require("bcryptjs");
const ProviderService = db.providerService;
const Rating = db.rating;
const Tracking = db.tracking;
const Jobs = db.job;
const SavedAddresses = db.savedAddresses;
var nodemailer = require("nodemailer");
var mongoose = require("mongoose");
const { sendPushNotification } = require("../helpers/pushNotifications");
const Service = db.service;
const Dispute = db.dispute;
const ReportedReview = db.reportedReview;
const Setting = db.setting;
const UserDevice = db.userDevice;
const Notification = db.notification;
const ExcelJS = require("exceljs");
const getAllSettings = require("../constants/settings");
let settings = null;
(async () => {
  settings = await getAllSettings();
})();
const StaticPage = db.staticPage;
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

// Calculate Tax
function taxCalculate(amount) {
  return (amount * settings.taxPercentage) / 100;
}

// make a function to count all users with status 1
exports.countAll = (req, res) => {
  User.countDocuments({ status: 1, userType: "user" })
    .then((count) => {
      res.send(JSON.stringify(count));
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving users.",
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
    userType: "user",
  })
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .then((users) => {
      User.countDocuments({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
        userType: "user",
      })
        .then((count) => {
          res.send({ users, count });
        })
        .catch((err) => {
          res.status(500).send({
            message:
              err.message || "Some error occurred while retrieving users.",
          });
        });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving users.",
      });
    });
};

// a find method to find certain users by createdAt range (fromDate, toDate)
// the date format is YYYY-MM-DD HH:mm:ss
exports.findByDateRange = async (req, res) => {
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;
  // console.log(fromDate, toDate)
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
    // console.log(i, newStartDate, newEndDate.toISOString())
    await User.find(
      {
        createdAt: {
          $gte: newStartDate.toISOString(),
          $lte: newEndDate.toISOString(),
        },
        userType: "user",
      },
      {
        _id: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: 1 })
      .then((users) => {
        // console.log(i, users)
        resultArr.push({
          value: users.length,
          time: newEndDate.getDate() + "/" + (+newEndDate.getMonth() + 1),
        });
        parsedfromDate += fixedTimeGap;
        // let newUsers = [];
        // for (let i = 0; i < users.length; i++) {
        //   let dayUser = new Date(users[i].createdAt);
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

        // res.send(JSON.stringify(finalResult));
      })
      .catch((err) => {
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving users.",
        });
      });
  }
  setTimeout(() => {
    res.send(JSON.stringify(resultArr));
  }, 2000);
};

// Find Record by ID
exports.findById = (req, res) => {
  const id = req.body.id;

  User.find({ _id: id })
    .then((data) => {
      // console.log(data)
      res.send(JSON.stringify(data[0]));
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
exports.update = (req, res) => {
  if (req.body.isApproved == true) {
    req.body.wasUserPreviously = true;
    req.body.approvalStatus = "accepted";

    let html = `
            <p>Dear ${req.body.firstName},</p>
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
        to: req.body.email,
        subject: " - Provider Profile Approval",
        html: html,
      });
    }
  }

  req.body.updatedAt = new Date().toISOString();

  User.updateOne({ _id: req.body._id }, req.body)
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
exports.create = (req, res) => {
  // console.log(req.body)
  req.body.email = req.body.email.toLowerCase();
  User.find({ email: req.body.email }).then((emailData) => {
    // console.log(emailData);
    if (emailData.length > 0) {
      res.status(400).send({
        status: "failure",
        message: "Email already exists.",
      });
    } else {
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

      (req.body.password = bcrypt.hashSync(req.body.password, 8)),
        User.insertMany([req.body])
          .then((data) => {
            console.log(data);
            res.send(JSON.stringify(data));
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

exports.updateUserType = (req, res) => {
  User.updateOne({ _id: req.body.id }, { userType: req.body.userType }).then(
    (result) => {
      res.status(200).send(result);
    }
  );
};

exports.findAllUser = (req, res) => {
  User.countDocuments({
    userType: "user",
  })
    .then((usersCount) => {
      res.send(JSON.stringify(usersCount));
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving users.",
      });
    });
};

// find all jobs
exports.findAllJobs = (req, res) => {
  const pageSize = req.body.pageSize || 10;
  const pageNumber = req.body.pageNumber || 1;
  const skip = (pageNumber - 1) * pageSize;
  const sortField = req.body.sortField || "updatedAt";
  const sortOrder = req.body.sortOrder || "desc";
  const search = req.body.search || "";
  const jobStatus = req.body.jobStatus || "";
  const paymentStatus = req.body.paymentStatus || "";
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;
  // console.log(fromDate, toDate)
  fromDate = getFormattedDate(new Date(fromDate));
  toDate = getFormattedDate(new Date(toDate));

  fromDate = fromDate + " 00:00:00";
  toDate = toDate + " 23:59:59";
  req.body.createdAt = new Date().toISOString();
  req.body.updatedAt = new Date().toISOString();

  const sort = {};
  sort[sortField] = sortOrder === "asc" ? 1 : -1;
  let JobSearchCondition = {
    $or: [],
  };
  if (jobStatus) {
    JobSearchCondition["jobStatus"] = jobStatus;
  }
  if (paymentStatus) {
    JobSearchCondition["paymentStatus"] = paymentStatus;
  }
  if (search) {
    JobSearchCondition.$or.push({
      serviceName: { $regex: search, $options: "ig" },
    });
  }
  User.find({
    $or: [
      { firstName: { $regex: search, $options: "ig" } },
      { lastName: { $regex: search, $options: "ig" } },
    ],
    isActive: true,
  }).then((userData) => {
    let userList = [];
    userData.map((ele) => {
      userList.push(mongoose.Types.ObjectId(ele._id));
    });
    if (userList.length > 0) {
      JobSearchCondition.$or.push({ userId: { $in: userList } });
      JobSearchCondition.$or.push({ providerId: { $in: userList } });
    }
    Jobs.find(JobSearchCondition)
      .populate("userId")
      .populate("serviceId")
      .populate("providerId")
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .then((jobs) => {
        // console.log("inside jobs");
        Jobs.countDocuments(JobSearchCondition)
          .then((count) => {
            res.send({ jobs, count, status: true });
          })
          .catch((err) => {
            res.status(500).send({
              status: false,
              message:
                err.message || "Some error occurred while retrieving Jobs.",
            });
          });
      })
      .catch((err) => {
        res.status(500).send({
          status: false,
          message: err.message || "Some error occurred while retrieving Jobs.",
        });
      });
  });
};

// Update Record by ID
exports.createJob = async (req, res) => {
  if (
    !req.body.unitPrice ||
    !req.body.providerId ||
    !req.body.serviceId ||
    !req.body.serviceName ||
    !req.body.jobType ||
    !req.body.durationExpected
  ) {
    res.status(404).send({
      status: false,
      message: "Please fill all the required fields.",
    });
    return;
  }
  // console.log(req.body)
  // return;
  let fileNameArr = [];
  let startSelfie = "";
  let endSelfie = "";
  // console.log(req.files)
  if (req.files.startSelfie) {
    startSelfie = req.files.startSelfie[0].filename;
  }
  if (req.files.endSelfie) {
    endSelfie = req.files.endSelfie[0].filename;
  }
  if (req.files.quoteFiles) {
    req.files.quoteFiles.map((ele) => {
      fileNameArr.push(ele.filename);
    });
  }
  req.body["createdAt"] = new Date().toISOString();
  req.body["updatedAt"] = new Date().toISOString();
  req.body.quoteFiles = fileNameArr;
  req.body.endSelfie = endSelfie;
  req.body.startSelfie = startSelfie;

  if (req.body.saveSenderAddress == "true") {
    var API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    var BASE_URL =
      "https://maps.googleapis.com/maps/api/geocode/json?place_id="; // use "place_id"
    var address = JSON.parse(req.body.sender).place_id;
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
    SavedAddresses.insertMany([
      {
        userId: req.body.userId,
        loc: loc,
        type: "sender",
        ...JSON.parse(req.body.sender),
      },
    ]).then((data1) => {
      // console.log("insert", data1);
    });
  }
  if (req.body.saveReceiverAddress == "true") {
    var API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    var BASE_URL =
      "https://maps.googleapis.com/maps/api/geocode/json?place_id="; // use "place_id"
    var address = JSON.parse(req.body.receiver).place_id;
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
    SavedAddresses.insertMany([
      {
        userId: req.body.userId,
        loc: loc,
        type: "receiver",
        ...JSON.parse(req.body.receiver),
      },
    ]).then((data1) => {
      // console.log("insert", data1);
    });
  }

  req.body.taxPercent = settings.taxPercentage;
  if (req.body.durationExpected) {
    req.body.calculatedPrice = req.body.unitPrice * req.body.durationExpected;
    req.body.taxAmount = taxCalculate(req.body.calculatedPrice);
    // req.body.totalAmount = req.body.taxAmount + req.body.calculatedPrice
  } else {
    req.body.taxAmount = null;
    req.body.calculatedPrice = null;
  }

  if (!req.body.endTime) {
    let startTime = Date.parse(req.body.startTime);
    startTime = startTime + req.body.durationExpected * 3600000;
    req.body.endTime = new Date(startTime).toISOString();
  }
  // console.log(req.body)

  Jobs.insertMany([req.body])
    .then((data) => {
      // console.log("data", data)
      res.send({
        status: true,
        message: "Job created successfully!",
        charge: req.body.calculatedPrice,
        vatAmount: req.body.taxAmount,
        vatPercentage: req.body.taxPercent,
        total: req.body.taxAmount + req.body.calculatedPrice,
        distance: req.body.distance,
        info: "Amounts may vary because duration is unknown.",
      });
    })
    .catch((err) => {
      // console.log(err)
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred while retrieving Job.",
      });
    });
};

// Update Record by ID
exports.updateJob = (req, res) => {
  req.body["updatedAt"] = new Date().toISOString();
  Jobs.updateOne({ _id: req.body._id }, req.body)
    .then((data) => {
      res.status(200).send({
        status: true,
        message: "Job updated successfully.",
      });
    })
    .catch((err) => {
      res.status(500).send({ status: false, message: err });
    });
};

// Find Record by ID
exports.findJobById = async (req, res) => {
  try {
    let data = await Jobs.findOne({ _id: req.body._id })
      .populate("userId")
      .populate("serviceId")
      .populate("providerId");

    let trackingData = await Tracking.findOne({ jobId: req.body._id });

    res.send({ data: data, trackingData: trackingData, status: true });
  } catch (err) {
    console.log("Error while fetching job data:", err);

    return res.status(500).send({
      status: false,
      message: "Error while fetching job data",
    });
  }
};

// Delete Record by ID
exports.deleteJobById = (req, res) => {
  const id = req.body.id;

  Jobs.deleteOne({ _id: id })
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

exports.getAllUser = (req, res) => {
  User.find({
    userType: "user",
  })
    .then((users) => {
      res.send(JSON.stringify(users));
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving users.",
      });
    });
};

exports.getAllDispute = (req, res) => {
  const pageSize = req.body.pageSize || 1;
  const pageNumber = req.body.pageNumber || 1;
  const skip = (pageNumber - 1) * pageSize;
  const sortField = req.body.sortField || "createdAt";
  const sortOrder = req.body.sortOrder || "desc";
  const search = req.body.search || "";
  const disputeStatus = req.body.disputeStatus || "";

  const sort = {};
  sort[sortField] = sortOrder === "asc" ? 1 : -1;
  let query = {
    $or: [{ jobId: { $regex: search, $options: "i" } }],
  };

  if (disputeStatus) {
    query.disputeStatus = disputeStatus;
  }

  User.find({
    $or: [
      { firstName: { $regex: search, $options: "ig" } },
      { lastName: { $regex: search, $options: "ig" } },
    ],
  })
    .then((providerData) => {
      let idArr = [];
      if (providerData.length > 0) {
        providerData.map((ele) => {
          idArr.push(ele._id);
        });
      }
      query.$or.push({ userId: { $in: idArr } });
      query.$or.push({ providerId: { $in: idArr } });
      Dispute.find(query)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .populate("userId")
        // .populate("serviceId")
        .populate("providerId")
        .then((dispute) => {
          Dispute.countDocuments(query)
            .then((count) => {
              res.send({ dispute, count });
            })
            .catch((err) => {
              res.status(500).send({
                message:
                  err.message ||
                  "Some error occurred while retrieving dispute.",
              });
            });
        })
        .catch((err) => {
          res.status(500).send({
            message:
              err.message || "Some error occurred while retrieving dispute.",
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

// Create Dispute b
exports.createDispute = async (req, res) => {
  // res.send({
  //     reqBody: req.body,
  //     reqFiles: req.files
  // });
  // return;
  req.body.updatedAt = new Date().toISOString();
  req.body.createdAt = new Date().toISOString();
  req.body.disputeStatus = "pending";
  req.body.resolvedAt = "";

  if (
    !req.body.userId ||
    !req.body.providerId ||
    !req.body.serviceId ||
    !req.body.serviceName ||
    !req.body.jobId
  ) {
    res.status(400).send({
      status: false,
      message: "Please send all the required fields.",
    });
  }

  let disputeFor;
  if (
    undefined !== req.files.providerDisputePicture &&
    req.files.providerDisputePicture
  ) {
    req.body.providerDisputePicture =
      req.files.providerDisputePicture[0].filename;
    disputeFor = "user";
  }

  if (
    undefined !== req.files.userDisputePicture &&
    req.files.userDisputePicture
  ) {
    req.body.userDisputePicture = req.files.userDisputePicture[0].filename;
    disputeFor = "provider";
  }

  try {
    let disputedata = await Dispute.findOne({ jobId: req.body.jobId });

    if (disputedata) {
      if (req.body.userDescription) {
        disputedata.userDescription = req.body.userDescription;
      }
      if (req.body.providerDescription) {
        disputedata.providerDescription = req.body.providerDescription;
      }
      if (req.body.userDisputePicture) {
        disputedata.userDisputePicture = req.body.userDisputePicture;
      }
      if (req.body.providerDisputePicture) {
        disputedata.providerDisputePicture = req.body.providerDisputePicture;
      }

      try {
        await Dispute.updateOne({ _id: disputedata._id }, disputedata);
      } catch (err) {
        res.status(500).send({
          status: false,
          message: "Error while updating dispute.",
        });
      }
    } else {
      try {
        await Dispute.insertMany(req.body);
      } catch (err) {
        console.log("Error while creating dispute:", err.message);

        res.status(500).send({
          status: false,
          message: "Error while creating dispute.",
        });
      }
    }
  } catch (err) {
    console.log("Error while finding job data:", err.message);

    res.status(500).send({
      status: false,
      message: "Error while finding job data.",
    });
  }

  try {
    await Jobs.updateOne(
      { jobId: req.body.jobId },
      { isDisputed: true, updatedAt: new Date().toISOString() }
    );
  } catch (err) {
    console.log("Error while updating job:", err.message);

    res.status(500).send({
      status: false,
      message: "Error while updating job.",
    });
  }

  try {
    const userDeviceInfo = await UserDevice.find({
      userId: disputeFor === "user" ? req.body.userId : req.body.providerId,
    });
    if (!userDeviceInfo) {
        console.log("No user devices information while creating dispute")
    }
    const notificationPayload = {
      title: "New dispute creation",
      message: "Dispute created",
      userType: disputeFor,
      providerId: disputeFor === "provider" ? req.body.providerId : null,
      userId: disputeFor === "user" ? req.body.userId : null,
      type: "dispute",
    };

    // Save the notification
    const newNotification = new Notification(notificationPayload);
    await newNotification.save();
    // for (const userDevices of userDeviceInfo ) {
    //   const notificationPayload2 = {
    //     ...notificationPayload,
    //     fcmToken: userDevices.fcmToken,
    //   };

    //   // Send push notification
    //   sendPushNotification(notificationPayload2);
    // }
    // sendPushNotification(notificationPayload);
    try {
      // Increment the disputeCount for the user or provider and update updatedAt
      const userIdToUpdate =
        disputeFor === "user" ? req.body.userId : req.body.providerId;
      await User.updateOne(
        { _id: mongoose.Types.ObjectId(userIdToUpdate) },
        { $inc: { disputeCount: 1 }, updatedAt: new Date().toISOString() }
      );

      // Check if the disputeCount reaches five
      const user = await User.findOne({
        _id: mongoose.Types.ObjectId(userIdToUpdate),
      });
      let allowNotificationTosend = false;
            if(disputeFor === "provider") {
                allowNotificationTosend = user.providerNotificationDispute
            } else if(disputeFor === "user"){
                allowNotificationTosend = user.userNotificationDispute
            }
      if(allowNotificationTosend){
        for (const userDevices of userDeviceInfo ) {
          const notificationPayload2 = {
            ...notificationPayload,
            fcmToken: userDevices.fcmToken,
          };
          // Send push notification
          sendPushNotification(notificationPayload2);
        }
      }
      if (user && user.disputeCount >= 5) {
        // Find all jobs for the userId or providerId and update jobStatus to 'CN' for ongoing jobs
        const jobsToUpdate = await Jobs.find({
          $or: [
            { userId: mongoose.Types.ObjectId(userIdToUpdate) },
            { providerId: mongoose.Types.ObjectId(userIdToUpdate) },
          ],
          jobStatus: "UP",
        });

        // Update jobStatus to 'CN' for ongoing jobs
        if (jobsToUpdate.length > 0) {
          await Jobs.updateMany(
            { _id: { $in: jobsToUpdate.map((job) => job._id) } },
            { jobStatus: "CN" }
          );

          console.log(
            `Updated jobStatus to 'CN' for ${jobsToUpdate.length} ongoing jobs.`
          );
        }

        // Check if there are any ongoing jobs ('ON')
        const ongoingJobs = await Jobs.findOne({
          $or: [
            {
              userId: mongoose.Types.ObjectId(userIdToUpdate),
              jobStatus: "ON",
            },
            {
              providerId: mongoose.Types.ObjectId(userIdToUpdate),
              jobStatus: "ON",
            },
          ],
        });

        if (!ongoingJobs) {
          // Block the account by setting isActive to false
          await User.updateOne(
            { _id: mongoose.Types.ObjectId(userIdToUpdate) },
            { isActive: false }
          );

          console.log(`User/Provider ${userIdToUpdate} has been blocked.`);
          let html = `
                  <p>Dear ${user.firstName},</p>
                  <p>Your account has been blocked, Please contact admin.</p>.
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
              from: settings.EMAIL_FROM,
              to: user.email,
              subject: " - Account BLocked",
              html: html,
            });
          }
        } else {
          console.log(
            `User/Provider ${userIdToUpdate} has ongoing jobs. Account not blocked.`
          );
        }
      }
    } catch (err) {
      // Handle errors
      console.error(err);
      res.status(500).send({
        status: false,
        message: "Error while updating user/provider dispute count and jobs.",
      });
      return;
    }
  } catch (error) {
    console.log("Error while updating notification info:", error.message);

    return res.status(500).send({
      status: false,
      message: "Internal error occurred",
    });
  }

  res.status(200).send({
    status: true,
    message: "Dispute created.",
  });
};

// Update Record by ID
exports.updateDispute = (req, res) => {
  const id = req.body._id;
  req.body.updatedAt = new Date().toISOString();
  if (req.files.providerDisputePicture) {
    req.body.providerDisputePicture =
      req.files.providerDisputePicture[0].filename;
  }

  if (req.files.userDisputePicture) {
    req.body.userDisputePicture = req.files.userDisputePicture[0].filename;
  }
  Dispute.updateOne({ _id: id }, req.body)
    .then((data) => {
      console.log(data);
      res.send(JSON.stringify(data));
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving dispute.",
      });
    });
};

// Get Record by ID
exports.getDisputeById = (req, res) => {
  const id = req.body._id;

  Dispute.findOne({ _id: id })
    .populate("userId")
    .populate("serviceId")
    .populate("providerId")
    .then((data) => {
      res.send(JSON.stringify(data));
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving dispute.",
      });
    });
};

// Delete Record by ID
exports.deleteDisputeById = (req, res) => {
  const id = req.body.id;

  Dispute.deleteOne({ _id: id })
    .then((data) => {
      console.log(data);
      res.send(JSON.stringify(data));
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving dispute.",
      });
    });
};

exports.getAllReport = (req, res) => {
  const pageSize = req.body.pageSize || 1;
  const pageNumber = req.body.pageNumber || 1;
  const skip = (pageNumber - 1) * pageSize;
  const sortField = req.body.sortField || "createdAt";
  const sortOrder = req.body.sortOrder || "desc";
  const search = req.body.search || "";
  const status = req.body.status || "";

  const sort = {};
  sort[sortField] = sortOrder === "asc" ? 1 : -1;
  let query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query = {
      $or: [],
    };
    User.find({
      $or: [
        { firstName: { $regex: search, $options: "ig" } },
        { lastName: { $regex: search, $options: "ig" } },
      ],
    })
      .then((providerData) => {
        let idArr = [];
        if (providerData.length > 0) {
          providerData.map((ele) => {
            idArr.push(ele._id);
          });
        }
        query.$or.push({ reportedPerson: { $in: idArr } });
        query.$or.push({ reportingPerson: { $in: idArr } });
        // console.log(idArr)
        ReportedReview.find(query)
          .sort(sort)
          .skip(skip)
          .limit(pageSize)
          .populate("reportedPerson")
          .populate("reportingPerson")
          .then((report) => {
            ReportedReview.countDocuments(query)
              .then((count) => {
                res.send({ report, count, status: true });
              })
              .catch((err) => {
                res.status(500).send({
                  status: false,
                  message:
                    err.message ||
                    "Some error occurred while retrieving Report.",
                });
              });
          })
          .catch((err) => {
            res.status(500).send({
              status: false,
              message:
                err.message || "Some error occurred while retrieving Report.",
            });
          });
      })
      .catch((err) => {
        res.status(500).send({
          status: false,
          message: "Some error occurred while retrieving data.",
        });
      });
  } else {
    ReportedReview.find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .populate("reportedPerson")
      .populate("reportingPerson")
      .then((report) => {
        ReportedReview.countDocuments(query)
          .then((count) => {
            res.send({ report, count, status: true });
          })
          .catch((err) => {
            res.status(500).send({
              status: false,
              message:
                err.message || "Some error occurred while retrieving Report.",
            });
          });
      })
      .catch((err) => {
        res.status(500).send({
          status: false,
          message:
            err.message || "Some error occurred while retrieving Report.",
        });
      });
  }
};

// Update Record by ID
exports.updateReport = (req, res) => {
  const id = req.body._id;
  req.body.updatedAt = new Date().toISOString();
  ReportedReview.updateOne({ _id: id }, req.body)
    .then((data) => {
      console.log(data);
      res.send({ data, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: true,
        message: err.message || "Some error occurred while retrieving dispute.",
      });
    });
};

// Get Record by ID
exports.getReportById = (req, res) => {
  const id = req.body._id;

  ReportedReview.findOne({ _id: id })
    .populate("reportingPerson")
    .populate("reportedPerson")
    .then((data) => {
      res.send({ data, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred while retrieving report.",
      });
    });
};

// Delete Record by ID
exports.deleteReportById = (req, res) => {
  const id = req.body.id;

  ReportedReview.deleteOne({ _id: id })
    .then((data) => {
      console.log(data);
      res.send({ data, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred while retrieving report.",
      });
    });
};

exports.getSettings = (req, res) => {
  Setting.find()
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred while retrieving Setting.",
      });
    });
};

exports.updateSetting = (req, res) => {
  const id = req.body._id;
  req.body.updatedAt = new Date().toISOString();
  Setting.updateOne({ _id: id }, req.body)
    .then((data) => {
      console.log(data);
      res.send({ data, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: true,
        message: err.message || "Some error occurred while retrieving dispute.",
      });
    });
};

exports.getAllRatingReview = (req, res) => {
  const pageSize = req.body.pageSize || 1;
  const pageNumber = req.body.pageNumber || 1;
  const skip = (pageNumber - 1) * pageSize;
  const sortField = req.body.sortField || "updatedAt";
  const sortOrder = req.body.sortOrder || "desc";
  const search = req.body.search || "";
  const status = req.body.status || "";

  const sort = {};
  sort[sortField] = sortOrder === "asc" ? 1 : -1;
  let query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query = {
      $or: [],
    };
    User.find({
      $or: [
        { firstName: { $regex: search, $options: "ig" } },
        { lastName: { $regex: search, $options: "ig" } },
      ],
    })
      .then((providerData) => {
        let idArr = [];
        if (providerData.length > 0) {
          providerData.map((ele) => {
            idArr.push(ele._id);
          });
        }
        query.$or.push({ userId: { $in: idArr } });
        query.$or.push({ providerId: { $in: idArr } });
        Service.find({
          $or: [{ name: { $regex: search, $options: "ig" } }],
        })
          .then((servicseData) => {
            let serviceIdArr = [];
            if (servicseData.length > 0) {
              servicseData.map((ele) => {
                serviceIdArr.push(ele._id);
              });
            }
            query.$or.push({ serviceId: { $in: serviceIdArr } });

            Rating.find(query)
              .sort(sort)
              .skip(skip)
              .limit(pageSize)
              .populate("userId")
              .populate("providerId")
              .populate("serviceId")
              .populate("jobId")
              .then((rating) => {
                Rating.countDocuments(query)
                  .then((count) => {
                    res.send({ rating, count, status: true });
                  })
                  .catch((err) => {
                    res.status(500).send({
                      status: false,
                      message:
                        err.message ||
                        "Some error occurred while retrieving rating.",
                    });
                  });
              })
              .catch((err) => {
                res.status(500).send({
                  status: false,
                  message:
                    err.message ||
                    "Some error occurred while retrieving rating.",
                });
              });
          })
          .catch((err) => {
            res.status(500).send({
              status: false,
              message: "Some error occurred while retrieving data.",
            });
          });
      })
      .catch((err) => {
        res.status(500).send({
          status: false,
          message: "Some error occurred while retrieving data.",
        });
      });
  } else {
    Rating.find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .populate("userId")
      .populate("providerId")
      .populate("serviceId")
      .populate("jobId")
      .then((rating) => {
        Rating.countDocuments(query)
          .then((count) => {
            res.send({ rating, count, status: true });
          })
          .catch((err) => {
            res.status(500).send({
              status: false,
              message:
                err.message || "Some error occurred while retrieving Report.",
            });
          });
      })
      .catch((err) => {
        res.status(500).send({
          status: false,
          message:
            err.message || "Some error occurred while retrieving Report.",
        });
      });
  }
};

// Update Record by ID
exports.updateRatingReview = (req, res) => {
  const id = req.body._id;
  req.body.updatedAt = new Date().toISOString();
  Rating.updateOne({ _id: id }, req.body)
    .then((data) => {
      console.log(data);
      res.send({ data, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: true,
        message: err.message || "Some error occurred while retrieving Rating.",
      });
    });
};

// Get Record by ID
exports.getRatingReviewById = (req, res) => {
  const id = req.body._id;

  Rating.findOne({ _id: id })
    .populate("userId")
    .populate("providerId")
    .populate("serviceId")
    .populate("jobId")
    .then((data) => {
      res.send({ data, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred while retrieving Rating.",
      });
    });
};

// Delete Record by ID
exports.deleteRatingReviewById = (req, res) => {
  const id = req.body.id;

  Rating.deleteOne({ _id: id })
    .then((data) => {
      console.log(data);
      res.send({ data, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred while retrieving Rating.",
      });
    });
};

exports.getAllContent = (req, res) => {
  StaticPage.find()
    .select("title")
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred while retrieving Content.",
      });
    });
};

exports.getContentById = (req, res) => {
  StaticPage.findOne({ _id: req.body._id })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred while retrieving Content.",
      });
    });
};

exports.updateContent = (req, res) => {
  const id = req.body._id;
  req.body.updatedAt = new Date().toISOString();
  StaticPage.updateOne({ _id: id }, req.body)
    .then((data) => {
      console.log(data);
      res.send({ data, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: true,
        message: err.message || "Some error occurred while retrieving Content.",
      });
    });
};

//TO genrate excel sheet for specified start date and end date for all jobs
exports.generateExcelSheetForAllJobs = async (req, res) => {
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;

  fromDate = new Date(fromDate).toISOString();
  toDate = new Date(toDate).toISOString();

  const workbook = new ExcelJS.Workbook();
  const jobSheet = workbook.addWorksheet("Jobs");

  try {
    // Fetch jobs from the database within the date range
    const jobs = await Jobs.find({
      createdAt: { $gte: fromDate, $lte: toDate },
    });
    console.log("Jobs====>", jobs);

    // Define the columns you want to include in the Excel sheet
    const columns = [
      { header: "Customer Name", key: "customerName" },
      { header: "Provider Name", key: "providerName" },
      { header: "Date of Job", key: "createdAt" },
      { header: "Service Category", key: "serviceName" },
      { header: "Job Description by Customer", key: "jobDetail" },
      { header: "Calculated Price", key: "calculatedPrice" },
      { header: "Total Amount", key: "finalPrice" },
    ];

    // Add job headers
    jobSheet.columns = columns;

    // Add job data
    for (const job of jobs) {
      // Fetch customer and provider details from the User collection
      const customer = await User.findOne({ _id: job.userId });
      const provider = await User.findOne({ _id: job.providerId });

      // Flatten nested objects for simplicity in Excel
      const flattenedJob = {
        customerName: `${customer.firstName} ${customer.lastName}`,
        providerName: `${provider.firstName} ${provider.lastName}`,
        createdAt: job.createdAt,
        serviceName: job.serviceName,
        jobDetail: job.jobDetail,
        calculatedPrice: job.calculatedPrice,
        finalPrice: job.finalPrice,
      };

      jobSheet.addRow(flattenedJob);
    }

    // Send the Excel file as a response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=jobs-export.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting data to Excel:", error);
    res.status(500).send({
      status: false,
      message: "Error exporting data to Excel",
    });
  }
};
