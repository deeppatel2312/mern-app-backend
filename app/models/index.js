const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.admin = require("./admin.model");
db.user = require("./user.model");
db.job = require("./job.model");
db.jobStatus = require("./jobStatus.model");
db.service = require("./service.model");
db.plan = require("./plan.model");
db.dispute = require("./dispute.model");
db.rating = require("./rating.model");
db.reportedReview = require("./reportedReview.model");
db.transaction = require("./transaction.model");
db.jobIdCounter = require("./jobIdCounter.model");
db.tracking = require("./tracking.model");
db.chat = require("./chat.model");
db.otp = require("./otp.model");
db.bankDetail = require("./bankDetail.model");
db.setting = require("./setting.model");
/*
    The subscription model is to manage all the subscriptions purchased by providers.
    NOT FOR PLAN LIST THAT IS MANAGED FROM ADMIN PANEL
*/
db.subscription = require("./subscription.model");
db.providerService = require("./providerService.model");
db.savedAddresses = require("./savedAddresses.model");
db.notification = require("./notification.model");
db.userDevice = require("./userDevice.model");
db.messagemodel = require("./chat.model")
db.usermessagemodel = require("./message.model")
db.staticPage = require("./staticPage.model")
module.exports = db;