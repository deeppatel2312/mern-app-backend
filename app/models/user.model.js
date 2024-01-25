const mongoose = require("mongoose");

const User = mongoose.model(
    "User",
    new mongoose.Schema({
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        password: String,
        isActive: { type: Boolean, default: true },
        createdAt: { type: String, default: () => new Date().toISOString() },
        updatedAt: { type: String, default: () => new Date().toISOString() },
        otp: String,
        profilePic: { type: String, default: "" },
        businessLicense: String,
        passportOrLicense: String,
        isAvailable: { type: Boolean, default: true },
        shiftStartTime: { type: Number, default: null },
        shiftEndTime: { type: Number, default: null },
        cancellationPolicy: { type: Number, default: null }, // It was text previously, but now its a number. (48, 12, 0)
        location: String,
        loc: { type: Object, default: {} }, // naming it "loc" because MongoDB's geoNear thing requires this particular format
        // Example of a loc object for geoNear functionality
        // loc: {
        //     "type" : "Point",
        //     "coordinates" : [<longitude>, <latitude>]
        // }
        plan: String,
        promoCode: String,
        isApproved: Boolean,
        /*
          When a provider signs up (or switches), they have to have the documents verified by admin.
          approvalStatus is for this. We use this key to determine if a user has requested to switch
          (so we can show a button in User's edit profile screen in Admin panel)
          We don't have "rejected" value here (for now)
        */
        approvalStatus: String, // pending/accepted
        ratingUser: { type: Number, default: 0 }, // This is because we have two-way ratings
        ratingProvider: { type: Number, default: 0 },
        userType: String,
        providerType: String, // company, individual
        bio: String,
        numberOfRatings: { type: Number, default: 0 },
        starOne: { type: Number, default: 0 },
        starTwo: { type: Number, default: 0 },
        starThree: { type: Number, default: 0 },
        starFour: { type: Number, default: 0 },
        starFive: { type: Number, default: 0 },
        userNumberOfRatings: { type: Number, default: 0 },
        userStarOne: { type: Number, default: 0 },
        userStarTwo: { type: Number, default: 0 },
        userStarThree: { type: Number, default: 0 },
        userStarFour: { type: Number, default: 0 },
        userStarFive: { type: Number, default: 0 },
        userNotificationJob: { type: Boolean, default: true }, //notification flags related to receiving specific kind of notifications for user
        userNotificationRating: { type: Boolean, default: true },
        userNotificationChat: { type: Boolean, default: true },
        userNotificationPayment: { type: Boolean, default: true },
        userNotificationDispute: { type: Boolean, default: true },
        providerNotificationJob: { type: Boolean, default: true }, //notification flags related to receiving specific kind of notifications for provider
        providerNotificationRating: { type: Boolean, default: true },
        providerNotificationChat: { type: Boolean, default: true },
        providerNotificationPayment: { type: Boolean, default: true },
        providerNotificationDispute: { type: Boolean, default: true },
        socialName: { type: String, default: null },
        facebookid: { type: Number, default: 0 },
        for: { type: String, default: "" },
        verified_email: { type: Boolean, default: false },
        googleId: { type: Number, default: 0 },
        wasUserPreviously: { type: Boolean, default: false }, // this flag is specifically to determine if a provider was user previously.
        disputeCount: { type: Number, default: 0 },
        token: { type: String, default: '' } // this the JWT token string
    }),
    "users"
);

module.exports = User;
