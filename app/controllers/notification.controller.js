const db = require("../models");
const Notification = db.notification;
const User = db.user;

exports.listNotifications = async (req, res) => {
    try {
        let id = req.body.id;
        let userType = req.body.userType;

        const userInfo = await User.findById({ _id: id });

        if (!userInfo) {
            return res.status(400).send({ status: false, message: "User not found." });
        }

        // Filter notifications based on user type and user/provider ID and notification type
        let filter = {};
        if (userType === "provider") {
            filter = { providerId: id };
        } else {
            filter = { userId: id };
        }

        // const notifications = await Notification.find(filter);

        // If want to send recent 10 notifications
        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 }) // Sort by createdAt in descending order (latest first)
            .limit(10); // Limit to the latest 10 notifications

        res.status(200).send({
            status: true,
            message: "Notifications retrieved successfully.",
            notifications: notifications,
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ status: false, message: "Internal Server Error." });
    }
};

//list all notifications with pagination
exports.listNotificationsWithPagination = async (req, res) => {
    try {
        let id = req.body.id;
        let userType = req.body.userType;
        let page = req.body.page || 1;
        let limit = req.body.limit || 10;
        let sortBy = req.body.sortBy || "createdAt"; // Default sort by createdAt

        const userInfo = await User.findById({ _id: id });

        if (!userInfo) {
            return res.status(400).send({ status: false, message: "User not found." });
        }

        // Filter notifications based on user type and user/provider ID and notification type
        let filter = {};
        if (userType === "provider") {
            filter = { providerId: id };
        } else {
            filter = { userId: id };
        }

        const totalCount = await Notification.countDocuments(filter);

        const notifications = await Notification.find(filter)
            .sort({ [sortBy]: -1 }) // Sort in descending order by default, you can change to 1 for ascending
            .skip((page - 1) * limit)
            .limit(limit);

        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).send({
            status: true,
            message: "Notifications retrieved successfully.",
            notifications: notifications,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ status: false, message: "Internal Server Error." });
    }
};

