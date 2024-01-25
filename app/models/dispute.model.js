const mongoose = require("mongoose");

const Dispute = mongoose.model(
    "Dispute",
    new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
        jobId: String,
        userDescription: String,
        providerDescription: String,
        serviceName: String, // so even if the name changes, dispute history doesn't change
        createdAt: String,
        updatedAt: String,
        resolvedAt: {
            type: String,
            default: null,
        },
        userDisputePicture: String,
        providerDisputePicture: String,
        disputeStatus: String // pending/review/resolved
    })
);

module.exports = Dispute;

/*
Pending - No action taken
Review - Being reviewed
Resolved - Resolved
*/