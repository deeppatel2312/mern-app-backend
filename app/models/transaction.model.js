/*  READ THIS BEFORE WORKING WITH MODEL !!!!!!!!!!!!!!!!!!!!!
    originalAmount is the original amount before any deductions or additions.
    commissionAmount is the amount deducted as commission, applicable only for transactions of type "payout.". For transactions of other types, this field can be set to zero
    finalAmount represents the total amount after considering the original amount and any applicable commission. For transactions of type "payout," it's the sum of the original amount and the commission. For transactions of other types, it's simply the original amount.

    Transaction types:
        sub = provider paying to admin
        job = user paying to admin
        payout = admin paying to provider (subtracting commission)

    User types:
        user
        provider
        '' empty is for admin (in case of payout)
        
    metadata contains the subscription transaction ID or job ID base on transaction type
    personId = by who and to whom, the amount is sent. Can't be empty, so use the key according to context
*/

const mongoose = require("mongoose");

const Transaction = mongoose.model(
    "Transaction",
    new mongoose.Schema({
        transactionId: String, // we'll get this ID from payment gateway.
        date: { type: String, default: () => new Date().toISOString() },
        originalAmount: { type: Number, default: 0 },
        commissionAmount: { type: Number, default: 0 },
        finalAmount: { type: Number, default: 0 },
        personId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        userType: String,
        transactionType: String,
        message: String,
        metadata: String
    })
);

module.exports = Transaction;
