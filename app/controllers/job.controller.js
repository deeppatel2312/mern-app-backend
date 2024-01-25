const db = require("../models");
const Jobs = db.job;
var nodemailer = require("nodemailer");
const User = db.user;
const SavedAddresses = db.savedAddresses;
const JobIdCounter = db.jobIdCounter;
const UserDevice = db.userDevice;
const Notification = db.notification;
const Transaction = db.transaction;
const commonConstants = require("../constants/common");
var mongoose = require("mongoose");
const { sendPushNotification } = require("../helpers/pushNotifications");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const getAllSettings = require("../constants/settings");
let settings = null;
(async () => {
  settings = await getAllSettings();
})();

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000);
}

function getFormattedDate(date) {
  // let dateStr = date.toISOString().split("T")[0];
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

exports.calculateTaxByAmount = (req, res) => {
  res.status(200).send({
    status: true,
    taxAmount: taxCalculate(Number(req.body.amount)),
    finalAmount:
      Number(req.body.amount) + taxCalculate(Number(req.body.amount)),
  });
};

// find all jobs
exports.findAll = (req, res) => {
  const pageSize = req.body.pageSize || 1;
  const pageNumber = req.body.pageNumber || 1;
  const skip = (pageNumber - 1) * pageSize;
  const sortField = req.body.sortField || "createdAt";
  const sortOrder = req.body.sortOrder || "desc";
  const search = req.body.search || "";
  const jobStatus = req.body.jobStatus || "";
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;
  // console.log(fromDate, toDate)
  fromDate = getFormattedDate(new Date(fromDate));
  toDate = getFormattedDate(new Date(toDate));

  fromDate = fromDate + " 00:00:00";
  toDate = toDate + " 23:59:59";

  const sort = {};
  sort[sortField] = sortOrder === "asc" ? 1 : -1;
  // find by createdAt desc
  // res.send("done")

  Jobs.find({
    $or: [{ jobStatus: { $regex: jobStatus, $options: "i" } }],
  })
    .populate("userId")
    .populate("serviceId")
    .populate("providerId")
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .then((jobs) => {
      Jobs.countDocuments({
        $or: [{ jobStatus: { $regex: jobStatus, $options: "i" } }],
      })
        .then((count) => {
          res.send({ jobs, count: Math.floor(count / pageSize), status: true });
        })
        .catch((err) => {
          res.status(500).send({
            status: false,
            message:
              err.message || "Some error occurred while retrieving services.",
          });
        });
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message:
          err.message || "Some error occurred while retrieving services.",
      });
    });
};

exports.findByDateRange = (req, res) => {
  // let fromDate = req.body.fromDate;
  // let toDate = req.body.toDate;
  // console.log(fromDate, toDate)
  // fromDate = getFormattedDate(new Date(fromDate));
  // toDate = getFormattedDate(new Date(toDate));

  // fromDate = fromDate + " 00:00:00";
  // toDate = toDate + " 23:59:59";
  // console.log(fromDate, toDate);

  Jobs.find({
    // "createdAt": { $gte: fromDate, $lte: toDate },
  })
    .then((result) => {
      // console.log(result);
      res.send(JSON.stringify(result));
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred while retrieving users.",
      });
    });
};

// Update Record by ID
exports.create = async (req, res) => {
  if (
    !req.body.unitPrice ||
    !req.body.providerId ||
    !req.body.serviceId ||
    !req.body.serviceName ||
    !req.body.jobType ||
    !req.body.startTime
  ) {
    res.status(404).send({
      status: false,
      message: "Please fill all the required fields.",
    });
    return;
  }

  // console.log("req.body",req.body);
  req.body["userId"] = req.personId;

  if (
    req.body.saveSenderAddress == "true" ||
    req.body.saveSenderAddress == true
  ) {
    SavedAddresses.insertMany([
      {
        userId: req.body.userId,
        type: "sender",
        ...req.body.sender,
      },
    ]).then((data1) => {
      // console.log("insert", data1);
    });
  }
  if (
    req.body.saveReceiverAddress == "true" ||
    req.body.saveReceiverAddress == true
  ) {
    SavedAddresses.insertMany([
      {
        userId: req.body.userId,
        type: "receiver",
        ...req.body.receiver,
      },
    ]).then((data1) => {
      // console.log("insert", data1);
    });
  }

  let jobCounter = await JobIdCounter.findOne();
  let currentJobId = jobCounter.jobId;
  let updatedJobId = ++currentJobId;

  await JobIdCounter.updateMany(
    { _id: jobCounter._id },
    { $set: { jobId: updatedJobId } }
  );
  req.body.jobId = updatedJobId;

    req.body.taxPercent = settings.taxPercentage;
    if (req.body.durationExpected) {
        // so we can cut minimum $50 charge on trucking jobs (moving/delivery)
        if (req.body.durationExpected < 1) {
            req.body.calculatedPrice = req.body.unitPrice * 1;
        } else {
            req.body.calculatedPrice = req.body.unitPrice * req.body.durationExpected;
        }

        req.body.taxAmount = taxCalculate(req.body.calculatedPrice);
        req.body.finalPrice = req.body.taxAmount + req.body.calculatedPrice;
    } else {
        req.body.taxAmount = null;
        req.body.calculatedPrice = null;
        req.body.finalPrice = null;
    }

  if (!req.body.endTime && req.body.durationExpected) {
    let startTime = Date.parse(req.body.startTime);
    startTime = startTime + req.body.durationExpected * 3600000;
    req.body.endTime = new Date(startTime).toISOString();
  }

  Jobs.insertMany([req.body])
    .then(async (data) => {
      try {
        const userDeviceInfo = await UserDevice.find({
          userId: req.body.providerId,
        });
        if (!userDeviceInfo) {
            console.log("No user devices information while creating job")
        }
        let userInfo = await User.findOne({ _id: req.body.providerId });

        const notificationPayload = {
          title: "New job creation",
          message: "New job is enlisted",
          userType: "provider",
          providerId: req.body.providerId,
          type: "job",
        };
        // Save the notification
        const newNotification = new Notification(notificationPayload);
        await newNotification.save();
        if(userInfo.providerNotificationJob) {
            for (const userDevices of userDeviceInfo ) {
                const notificationPayload2 = {
                  ...notificationPayload,
                  fcmToken: userDevices.fcmToken,
                };
          
                // Send push notification
                sendPushNotification(notificationPayload2);
              }
        }   
      } catch (error) {
        console.log("error", error);
      }

      res.send({
        status: true,
        message: "Job created successfully!",
        jobId: updatedJobId,
        charge: req.body.calculatedPrice,
        taxAmount: req.body.taxAmount,
        taxPercent: req.body.taxPercent,
        total: req.body.taxAmount + req.body.calculatedPrice,
        distance: req.body.distance,
        info: req.body.durationExpected
          ? ""
          : "Amounts may vary because duration is unknown.",
      });
    })
    .catch((err) => {
      console.log(err);

      return res.status(500).send({
        status: false,
        message: "Error occurred while saving job data.",
      });
    });
};

// Update Record by ID
exports.update = async (req, res) => {
  let { jobId } = req.body;

  delete req.body.jobId;

  req.body["updatedAt"] = new Date().toISOString();

  if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400).send({
      status: false,
      message: "Job ID is invalid.",
    });

    return;
  }

  let exists = await Jobs.findById(jobId);

  if (!exists) {
    res.status(400).send({
      status: false,
      message: "No data found for the job.",
    });

    return;
  }

  let resp = {
    status: true,
    message: "Job updated successfully.",
  };

  if (req.body.jobStatus == "CO") {
    if (Math.random() >= 0.5) {
      // because we don't have payment gateway at the moment ;)
      // keep the old job status if amount isn't credited.
      req.body.jobStatus = "ON";
      req.body.paymentFailed = true;
      resp.message = `Job isn't marked as completed due to insufficient amount in customer's account. The customer has been notified to pay ${exists.finalPrice}$`;
    } else {
      req.body.paymentStatus = "completed";
      resp.message = `Job marked as completed. ${exists.finalPrice}$ has been credited into your wallet.`;
    }
  }

  await Jobs.findByIdAndUpdate(jobId, req.body, { new: true });

  try {
    const userDeviceInfo = await UserDevice.find({
        userId: exists.userId,
      });
      if (!userDeviceInfo) {
        console.log("No user devices information while updating job")
      }
      const userInfo = await User.findOne({
        _id: mongoose.Types.ObjectId(exists.userId),
      });
      const notificationPayload = {
        title: "Job status change",
        message: `Job status changed to ${req.body.jobStatus}`,
        userType: "user",
        userId: exists.userId,
        type: "job",
      };
      // Save the notification
      const newNotification = new Notification(notificationPayload);
      await newNotification.save();
      if(userInfo && userInfo.userNotificationJob){
      for (const userDevices of userDeviceInfo ) {
        const notificationPayload2 = {
          ...notificationPayload,
          fcmToken: userDevices.fcmToken,
        };
        // Send push notification
        sendPushNotification(notificationPayload2);
      }   
    }
  } catch (error) {
    console.log("error", error)
  }

  if (req.body.jobStatus == "CO") {
    // Check if userId is present
    if (exists.userId) {
      const userIdToUpdate = exists.userId;

      // Continue with the logic for userId
      const user = await User.findOne({
        _id: mongoose.Types.ObjectId(userIdToUpdate),
      });
      if (user && user.disputeCount >= 5) {
        const ongoingUserJobs = await Jobs.findOne({
          userId: mongoose.Types.ObjectId(userIdToUpdate),
          jobStatus: "ON",
        });

        if (!ongoingUserJobs) {
          await User.updateOne(
            { _id: mongoose.Types.ObjectId(userIdToUpdate) },
            { isActive: false }
          );
          resp.message += ` User ${user.firstName} has been blocked.`;
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
          resp.message += ` User ${user.firstName} has ongoing jobs. Account not blocked.`;
        }
      }
    }

    // Check if providerId is present
    if (exists.providerId) {
      const providerIdToUpdate = exists.providerId;

      // Continue with the logic for providerId
      const provider = await User.findOne({
        _id: mongoose.Types.ObjectId(providerIdToUpdate),
      });
      if (provider && provider.disputeCount >= 5) {
        const ongoingProviderJobs = await Jobs.findOne({
          providerId: mongoose.Types.ObjectId(providerIdToUpdate),
          jobStatus: "ON",
        });

        if (!ongoingProviderJobs) {
          await User.updateOne(
            { _id: mongoose.Types.ObjectId(providerIdToUpdate) },
            { isActive: false }
          );
          resp.message += ` Provider ${provider.firstName} has been blocked.`;
          let html = `
            <p>Dear ${provider.firstName},</p>
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
              to: provider.email,
              subject: " - Account BLocked",
              html: html,
            });
          }
        } else {
          resp.message += ` Provider ${provider.firstName} has ongoing jobs. Account not blocked.`;
        }
      }
    }
  }

  res.status(200).send(resp);
};

// Find Record by ID
exports.findById = (req, res) => {
  Jobs.find({ _id: req.body._id })
    .then((data) => {
      res.send({ data: data, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message:
          err.message || "Some error occurred while retrieving services.",
      });
    });
};

exports.updateQuoteStatus = (req, res) => {
  let otp = null;
  if (req.body.quoteStatus == "accepted") {
    req.body.jobStatus = "UP";
  }
  if (!req.body.jobId || !req.body.quoteStatus || !req.body.providerId) {
    res.status(404).send({
      status: false,
      message: "All fields are required!",
    });

    return;
  }

  if (!commonConstants.QUOTE_STATUSES.includes(req.body.quoteStatus)) {
    res.status(400).send({
      status: false,
      message: "Invalid quote status!",
    });

    return;
  }

  if (req.body.quoteStatus == "accepted") {
    otp = generateOtp();
    User.find({ _id: mongoose.Types.ObjectId(req.personId) }).then(
      (userData) => {
        // console.log(userData);
        if (userData.length > 0) {
          User.find({ _id: req.body.providerId }).then((providerData) => {
            let html = `<p>Hi ${userData[0].firstName} ${userData[0].lastName},</p>
          <p>Here is your OTP:</p>
          <p><strong>OTP</strong>: ${otp}</p>
          <h3>Provider Details</h3>
          <p><strong>Name</strong>: ${providerData[0].firstName} ${providerData[0].lastName}</p>
          <p><strong>Email</strong>: ${providerData[0].email}</p>
          <p><strong>Contact No.</strong>: ${providerData[0].phone}</p>
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
                to: userData[0].email,
                subject: " - OTP",
                html: html,
              });
            }
          });
        } else {
          res.send({
            status: false,
            message: "Something went wrong",
          });
        }
      }
    );
  }
  let payload = {
    quoteStatus: req.body.quoteStatus,
    otp: otp,
    updatedAt: new Date().toISOString(),
  };
  if (req.body.jobStatus) {
    payload.jobStatus = req.body.jobStatus;
  }
  if (req.body.quoteStatus == "rejected") {
    payload.jobStatus = "CN";
  }
  Jobs.updateMany({ _id: req.body.jobId }, payload)
    .then(async (data) => {
      const userDeviceInfo = await UserDevice.find({
        userId: req.body.providerId,
      });
      if (!userDeviceInfo) {
        console.log("No user devices information while job request update")
      }
      let userInfo = await User.findOne({ _id: req.body.providerId });
      const notificationPayload = {
        title: "Job request update",
        message: `Job Status ${req.body.quoteStatus}`,
        userType: "provider",
        providerId: req.body.providerId,
        type: "job",
      };
      // Save the notification
      const newNotification = new Notification(notificationPayload);
      await newNotification.save();
      if(userInfo.providerNotificationJob) {
      for (const userDevices of userDeviceInfo ) {
        const notificationPayload2 = {
          ...notificationPayload,
          fcmToken: userDevices.fcmToken,
        };
  
        // Send push notification
        sendPushNotification(notificationPayload2);
      }
    }
      res.send({ message: "Quote status updated successfully!", status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message: err.message || "Some error occurred.",
      });
    });
};

exports.matchOtp = async (req, res) => {
  let data = await Jobs.findOne({ _id: req.body.jobId });

  if (data.otp == req.body.otp) {
    res.status(200).send({
      status: true,
      message: "OTP matched",
    });
  } else {
    res.status(200).send({
      status: false,
      message: "OTP does not match",
    });
  }
};

exports.quoteFileUpload = async (req, res) => {
  let fileNameArr = [];

  req.body.quoteDescription = req.body.quoteDescription || "";
  req.body.lineItemsData = req.body.lineItemsData || "";
  req.body.existingQuoteData = req.body.existingQuoteData || "";

  if (!req.body.jobId) {
    res.status(400).send({
      status: false,
      message: "Job ID is required.",
    });

    return;
  }

  if (req.files.quoteFiles) {
    req.files.quoteFiles.map((ele) => {
      fileNameArr.push(ele.filename);
    });
  }
  req.body.quoteFiles = fileNameArr;

  let jobData = await Jobs.findOne({ _id: req.body.jobId });
  //jobdta.userId for sending push notifications.

  if (jobData.quoteFiles && jobData.quoteFiles.length > 0) {
    fileNameArr = [...jobData.quoteFiles, ...fileNameArr];
  }

  let updatedData = {
    lineItemsData: req.body.lineItemsData,
    lineItemsTotal: req.body.lineItemsTotal,
    quoteFiles: fileNameArr,
    existingQuoteData: req.body.existingQuoteData,
    quoteDescription: req.body.quoteDescription,
    isQuoteSent: true,
    quoteStatus: "pending",
    updatedAt: new Date().toISOString(),
  };

  if (undefined !== req.body.durationUpdated && req.body.durationUpdated) {
    updatedData.durationUpdated = Number(req.body.durationUpdated);
    let calculatedPrice = jobData.unitPrice * req.body.durationUpdated;
    let taxAmount = (calculatedPrice * Number(settings.taxPercentage)) / 100;
    let finalPrice = calculatedPrice + taxAmount;
    let startTime = jobData.startTime;
    let endTime = new Date(
      new Date(startTime).getTime() + req.body.durationUpdated * 60 * 60 * 1000
    );
    let endTimeISOString = endTime.toISOString();

    updatedData.calculatedPrice = calculatedPrice;
    updatedData.taxAmount = taxAmount;
    updatedData.finalPrice = finalPrice;
    updatedData.endTime = endTimeISOString;
  }

  if (undefined !== req.body.updatedTotal && req.body.updatedTotal) {
    updatedData.calculatedPrice = Number(req.body.updatedTotal);
    updatedData.taxAmount = Number(
      (req.body.updatedTotal * Number(settings.taxPercentage)) / 100
    );
    updatedData.finalPrice =
      updatedData.calculatedPrice + updatedData.taxAmount;
  }

  await Jobs.updateOne({ _id: req.body.jobId }, updatedData);

  try {
    const userDeviceInfo = await UserDevice.find({ userId: jobData.userId });
    if (!userDeviceInfo) {
        console.log("No user devices information for quote from provider")
      }
    let userInfo = await User.findOne({ _id: jobData.userId });
    const notificationPayload = {
      title: "New re-quote",
      message: "New re-quote from provider",
      userType: "user",
      userId: jobData.userId,
      type: "requote",
    };
    // Save the notification
    const newNotification = new Notification(notificationPayload);
    await newNotification.save();
    if(userInfo.userNotificationJob){
    for (const userDevices of userDeviceInfo ) {
        const notificationPayload2 = {
          ...notificationPayload,
          fcmToken: userDevices.fcmToken,
        };
  
        // Send push notification
        sendPushNotification(notificationPayload2);
      }    
    }
  } catch (error) {
    console.log("error", error);
  }

  res.status(200).send({
    status: true,
    message: "Quote sent successfully.",
  });
};

exports.calculateTaxAmount = (req, res) => {
  if (!req.body.unitPrice || !req.body.durationExpected) {
    res.status(400).send({
      status: false,
      message: "Unit price and expected duration are required!",
    });
  }

  let calculatedPrice = req.body.unitPrice * req.body.durationExpected;

  res.send({
    status: true,
    charge: calculatedPrice,
    taxAmount: taxCalculate(calculatedPrice),
    taxPercent: Number(settings.taxPercentage),
    total: calculatedPrice + taxCalculate(calculatedPrice),
  });
};

exports.generateInvoice = async (req, res) => {
  try {
    let jobData = await Jobs.findById(req.body.jobId);

    if (!jobData.jobId) {
      return res.status(500).send({
        status: false,
        message: "Invoice couldn't be generated",
      });
    }

    /********************************** Invoice thing starts ************************/
    // generating invoice anyway, because then we can see PDF on local and live as well
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const dynamicData = { jobData };
    const htmlContent = generateInvoiceHTML(dynamicData);

    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
    await page.emulateMediaType("screen");

    let pdfFileName = `invoice_${jobData.jobId}.pdf`;
    const pdfFilePath = path.join(__dirname, "../../", "public", pdfFileName);

    try {
      await page.pdf({
        path: pdfFilePath,
        margin: { top: "30px", right: "50px", bottom: "50px", left: "50px" },
        printBackground: true,
        format: "A4",
      });
    } catch (err) {
      console.error("Error creating PDF:", err.message);

      return res.status(500).send({
        status: false,
        message: "Error creating PDF",
      });
    }

    await browser.close();
    /********************************** Invoice thing ends ************************/

    if (undefined === jobData.invoice || !jobData.invoice) {
      (async () => {
        try {
          await Jobs.updateOne(
            { _id: req.body.jobId },
            { invoice: pdfFileName }
          );

          return res.status(200).send({
            status: true,
            invoicePath: pdfFileName,
          });
        } catch (err) {
          console.log("Error while updating job data:", err.message);

          return res.status(500).send({
            status: false,
            message: "Error while updating job data.",
          });
        }
      })();
    } else {
      return res.status(200).send({
        status: true,
        invoicePath: jobData.invoice,
      });
    }
  } catch (err) {
    console.log("Error while fetching job data:", err.message);

    return res.status(500).send({
      status: false,
      message: "Error while fetching job data.",
    });
  }
};

function generateInvoiceHTML(data) {
  data = data.jobData;

  const logoPath = path.join(__dirname, "../", "assets/images/logo.png");
  const imageBuffer = fs.readFileSync(logoPath);
  const base64Image = imageBuffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64Image}`;

  let html = `
        <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                    }
            
                    header {
                        margin-top: 20px;
                        margin-bottom: 30px;
                        text-align: right;
                    }
            
                    h2 {
                        color: #333;
                    }
            
                    #invoice {
                        width: 100%;
                        font-size: small;
                        border-collapse: collapse;
                    }
            
                    #invoice th,
                    #invoice td {
                        border: 1px solid #ddd;
                        padding: 6px 8px;
                        text-align: left;
                    }
            
                    #invoice th, #totals #total {
                        background-color: #e9e7e7;
                    }
            
                    #totals {
                        margin-top: 20px;
                    }
            
                    #totals table {
                        width: 50%;
                        float: right;
                        border-collapse: collapse;
                    }
            
                    #totals table td {
                        font-size: small;
                        padding: 6px 8px;
                        border: 1px solid #ddd;
                        text-align: right;
                    }

                    #jobId {
                        font-size: small;
                    }
                </style>
            </head>
            <body>
                <img src="${dataUrl}" alt="Logo" width="100"/>

                <header>
                    <h2>Invoice</h2>
                </header>

                <p id="jobId">Job ID - <strong>${data.jobId}</strong></p>
            
                <section>
                    <table id="invoice">
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">#</th>
                                <th>Description</th>
                                <th style="text-align: right">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="text-align: center;">1</td>
                                <td>${data.serviceName}</td>
                                <td style="text-align: right">${
                                  data.lineItemsTotal
                                    ? `$${
                                        data.calculatedPrice.toFixed(2) -
                                        data.lineItemsTotal.toFixed(2)
                                      }`
                                    : `$${data.calculatedPrice.toFixed(2)}`
                                }</td>
                            </tr>`;

  if (data.lineItemsData) {
    const lineItemsArray = JSON.parse(data.lineItemsData);
    let count = 2; // because we already have one row above

    lineItemsArray.forEach((item, index) => {
      const key = Object.keys(item)[0];
      const value = Number(item[key]);

      html += `
                <tr>
                    <td style="text-align: center;">${count++}</td>
                    <td>${key}</td>
                    <td style="text-align: right">$${value.toFixed(2)}</td>
                </tr>`;
    });
  }

  html += `
                        </tbody>
                    </table>
                </section>
            
                <section id="totals">
                    <table>
                        <tr>
                            <td>Subtotal:</td>
                            <td>$${data.calculatedPrice.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>VAT (${settings.taxPercentage}%):</td>
                            <td>$${data.taxAmount.toFixed(2)}</td>
                        </tr>
                        <tr id="total">
                            <td>Total:</td>
                            <td>$${data.finalPrice.toFixed(2)}</td>
                        </tr>
                    </table>
                </section>
            </body>
        </html>
    `;

  return html;
}
