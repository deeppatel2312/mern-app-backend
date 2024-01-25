// this model is to keep records of all subscription purchases
// when provider buys a Plan so planId is for that

const mongoose = require("mongoose");

const Subscription = mongoose.model(
    "Subscription",
    new mongoose.Schema({
        transactionId: String, // we'll get this ID from payment gateway.
        purchaseDate: { type: String, default: () => new Date().toISOString() },
        providerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        planId: String,
        startDate: { type: String, default: () => new Date().toISOString() },
        endDate: String,
        discount: Number
    })
);

module.exports = Subscription;
