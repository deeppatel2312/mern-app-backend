// This is for saving bank details of a person (currently we have provider only, but in case it changes in future)

const mongoose = require("mongoose");

const BankDetail = mongoose.model(
    "BankDetail",
    new mongoose.Schema({
        accountNumber: String,
        accountHolderName: String,
        ifscCode: String,
        branchName: String,
        personId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    }),
    "bankDetails"
);

module.exports = BankDetail;
