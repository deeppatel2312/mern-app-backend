const mongoose = require("mongoose");

const Job = mongoose.model(
  "Job",
  new mongoose.Schema({
    unitPrice: { type: Number, default: null }, // hourly price of the service
    calculatedPrice: { type: Number, default: null }, // calculated, if the time is known, otherwise null
    finalPrice: { type: Number, default: null }, // finalized, when the job is completed (including all the extra charges and deductions)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceName: String, // so even if the name changes, job history doesn't change
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    pickupTime: { type: String, default: null },
    jobStatus: { type: String, default: null },
    jobType: String, // services/moving/delivery
    jobId: Number,
    requestStatus: { type: String, default: 'pending' }, // pending/accepted/rejected
    quoteStatus: { type: String, default: null }, // pending/accepted/rejected
    paymentStatus: { type: String, default: 'pending' }, // pending/completed
    trackingStatus: { type: String, default: null }, // otw/inTransit/delivered
    durationExpected: { type: Number, default: null }, // In hours. Its sent when job is being created.
    durationUpdated: { type: Number, default: null }, // In hours. Its updated time that provider shares. (if needed)
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    jobDetail: { type: String, default: null },
    otp: { type: String, default: null },
    /*
      paymentFailed flag is for when provider attempts to complete job, but there's insufficient amount in customer's bank account,
      so the job stays in Ongoing status and customer is shown a payment button
    */
    paymentFailed: { type: Boolean, default: false },
    isQuoteSent: { type: Boolean, default: false },
    startSelfie: String,
    endSelfie: String,
    invoice: String, // this is a PDF file's path that gets generated if non-existent
    distance: { type: String, default: null },
    packageLocation: String,
    taxAmount: Number,
    taxPercent: Number,
    quoteFiles: [],
    existingQuoteData: String,
    lineItemsData: String,
    lineItemsTotal: Number,
    quoteDescription: String,
    isDisputed: { type: Boolean, default: false },
    ratedByUser: { type: Boolean, default: false },
    ratedByProvider: { type: Boolean, default: false },
    tip: { type: Number, default: 0 },
    liveLat: Number,
    liveLong: Number,
    sender: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      address: String
    },
    receiver: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      address: String
    },
  })
);

module.exports = Job;
