const mongoose = require("mongoose");

const Plan = mongoose.model(
    "Plan",
    new mongoose.Schema({
        name: String,
        price: Number,
        description: String,
        promoCode: String,
        discount: Number,
        duration: { type: Number, default: 0 }, // number of days (if any, otherwise leave empty)
        isActive: Boolean
    }),
    "plans"
);

module.exports = Plan;
