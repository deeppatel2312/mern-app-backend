const { sendPushNotification } = require("../helpers/pushNotifications");
const { chat } = require("googleapis/build/src/apis/chat");
const db = require("../models");
var mongoose = require("mongoose");
// const { Message } = require("twilio/lib/twiml/MessagingResponse");
const Chat = db.chat;
const Message = db.usermessagemodel;
const User = db.user;
const express = require("express");
const app = express();
const Notification = db.notification;
const UserDevice = db.userDevice;

//Function to create chat
exports.createdChats = async (data) => {
    try {
        const userIds = [...data].sort();
        // console.log('userIds----', userIds)

        const checkExistingRoom = await Chat.findOne({
            user: userIds,
        });

        if (checkExistingRoom) {
            return checkExistingRoom;
        } else {
            const addNewRoom = new Chat({
                user: userIds,
            });
            const saveRoom = await addNewRoom.save(); // Make sure to await the save operation
            return saveRoom;
        }
    } catch (error) {
        // Consider using a more appropriate method to handle errors, such as throwing an exception
        console.error(error.message || "Internal Server Error");
        return {
            status: false,
            message: "Internal Server Error",
        };
    }
};

/* commented working code */
// exports.getcreatedchat = async (data) => {
//   try {
//     const userId = data.userID;
//     let fetchedMessages = await Chat.find({ user: { $all: [userId] } })
//       .populate("user")
//       .sort({ "messages.createdAt": "asc" });

//     for (let chat of fetchedMessages) {
//       const lastMessage = await Message.findOne({ roomID: chat._id }).sort({
//         createdAt: -1,
//       });
//       chat.lastMessage = lastMessage; // Add lastMessage directly to the chat object
//     }
//     console.log("fetched", fetchedMessages)
//     if (fetchedMessages) {
//       return fetchedMessages;
//     }
//   } catch (err) {
//     console.error(err, "error");
//   }
// };

/** Working code with search functionality for getting chat list*/
exports.getcreatedchat = async (data) => {
    try {
        const userId = data.userID;
        const searchKey = data.searchKey; // Assuming you have a search key in your data

        const regex = new RegExp(searchKey, "i"); // Case-insensitive regular expression

        let fetchedMessages = await Chat.find({
            user: { $all: [userId] },
        })
            .populate({
                path: "user",
                match: {
                    $and: [
                        { _id: { $ne: userId } }, // Exclude yourself
                        {
                            $or: [
                                { firstName: { $regex: regex } }, // Search by first name
                                { lastName: { $regex: regex } }, // Search by last name
                            ],
                        },
                    ],
                },
            })
            .sort({ "messages.createdAt": "asc" });

        // Filter the populated user array based on the search criteria
        fetchedMessages = fetchedMessages.map((chat) => {
            chat.user = chat.user.filter(
                (user) =>
                    (user.firstName && user.firstName.match(regex)) ||
                    (user.lastName && user.lastName.match(regex))
            );
            return chat;
        });

        for (let chat of fetchedMessages) {
            const messages = await Message.find({ roomID: chat._id }).sort({
                createdAt: 1, // Sort in ascending order to get messages from oldest to newest
            });

            chat.lastMessage = messages[messages.length - 1]; // Set lastMessage to the newest message

            // Count the number of unseen messages for the current user
            const unseenMessageCount = messages.reduce((count, message) => {
                return count + (message.seenBy.includes(userId) ? 0 : 1);
            }, 0);

            // Find the index of the user in unseenMessageCount array
            const userIndex = chat.unseenMessageCount.findIndex((item) =>
                item.userId.equals(userId)
            );

            if (userIndex !== -1) {
                // If the user is found, update the count
                chat.unseenMessageCount[userIndex].count = unseenMessageCount;
            } else {
                // If the user is not found, add a new entry
                chat.unseenMessageCount.push({
                    userId: userId,
                    count: unseenMessageCount,
                });
            }
        }

        // Remove chats with empty user arrays
        fetchedMessages = fetchedMessages.filter((chat) => chat.user.length > 0);

        // console.log('fetched', fetchedMessages);

        if (fetchedMessages) {
            return fetchedMessages;
        }
    } catch (err) {
        console.error(err, "error");
    }
};

const handleImageUpload = (data) => {
    return new Promise((resolve, reject) => {
        if (data && data.image) {
            // Extract base64 part without the data URI prefix
            const base64String = data.image.split(",")[1];
            // Convert base64 string to buffer
            const imageBuffer = Buffer.from(base64String, "base64");
            // Generate a unique filename or use the original name
            const filename = `${Date.now()}-image.png`;
            // Write buffer to disk
            require("fs").writeFileSync(`./public/${filename}`, imageBuffer);
            // Resolve with the filename
            resolve({ filename });
        } else {
            reject(new Error("No image data provided."));
        }
    });
};

/******* Function to send message *******/
exports.sendMessage = async (data) => {
    try {
        const { message, senderID, receiversID, roomID, userType } = data;
        //  Check if the sender is blocked by any receiver in the chat
        const chat = await Chat.findOne({
            user: { $all: [senderID, receiversID] },
        });
        // console.log(chat,"chat")
        if (chat && chat.blockedUsers?.length) {
            console.log("Sender is blocked in this chat.");
            return false;
            //  throw new Error("Sender is blocked in this chat.");
        }

        // Check if there's an image file in the request
        if (data && data.image) {
            // Handle the image upload using multer
            const result = await handleImageUpload(data);

            // Add the image information to the message
            data.image = result.filename;
        }
        const newMessage = new Message({
            message: message,
            senderID: senderID,
            receiversID: receiversID,
            roomID: roomID,
            image: data.image,
            type: data.type,
        });
        // Add the senderID to the seenBy array
        newMessage.seenBy.push(senderID);
        const savedMessage = await newMessage.save();

        //for push notifications 
        try {

            const userDeviceInfo = await UserDevice.find({
                userId: receiversID,
            });
            if (!userDeviceInfo) {
                console.log("No user devices information while sending message")
            }
            let userInfo = await User.findOne({ _id: receiversID });

            const notificationPayload = {
                title: "Chat Message",
                message: "New chat message received",
                userType: userType === "provider" ? "user" : "provider",
                providerId: userType === "provider" ? null : receiversID,
                userId: userType === "provider" ? receiversID : null,
                type: "chat",
            };
            // Save the notification
            const newNotification = new Notification(notificationPayload);
            await newNotification.save();
            let allowNotificatioToSend = false;
            if (userType === "provider") {
                allowNotificatioToSend = userInfo.userNotificationChat
            } else {
                allowNotificatioToSend = userInfo.providerNotificationChat
            }
            if (allowNotificatioToSend) {
                for (const userDevices of userDeviceInfo) {
                    const notificationPayload2 = {
                        ...notificationPayload,
                        fcmToken: userDevices.fcmToken,
                    };
                    // Send push notification
                    sendPushNotification(notificationPayload2);
                }
            }
        } catch (error) {
            console.log("Error", error);
        }

        return savedMessage;
    } catch (error) {
        console.error(error);
    }
};

/******* Function to get all messages  ********/
// exports.getAllMesg = async (data) => {
//   try {
//     const roomId = data._id;
//     // console.log("Data here ======>", data)
//     const fetchedMessages = await Message.find({ roomID: roomId })
//       .populate("senderID")
//       .populate("receiversID");
//     if (fetchedMessages) {
//       // console.log("fetched messages===>", fetchedMessages)
//       return fetchedMessages;
//     }
//   } catch (err) {
//     console.error(err, "error");
//   }
// };

exports.getAllMesg = async (data) => {
    try {
        const roomId = data._id;
        const userId = data.userId2; // Assuming userID is provided in the data

        // Fetch all messages for the given room
        const fetchedMessages = await Message.find({ roomID: roomId })
            .populate("senderID")
            .populate("receiversID");

        // Update the seenBy array for each message with the current user's ID
        for (const message of fetchedMessages) {
            if (!message.seenBy.includes(userId)) {
                message.seenBy.push(userId);
                // Mark the message as seen by the current user by updating seenStatus
                message.seenStatus = true;
                await message.save();
            }
        }

        if (fetchedMessages) {
            return fetchedMessages;
        }
    } catch (err) {
        console.error(err, "error");
    }
};

// exports.deleteMessage = async (id) => {
//   try {
//     const user = await Message.deleteOne(
//       {
//         _id: id,
//       },
//       // { $set: { isDeleted: true } },
//       // { new: true }
//     );
//     if (user) {
//       let message;
//       message = "Message Deleted Successfully";

//       let resObj = {
//         status: "responses.SUCCESS",
//         messageID: "responses.SUCCESS_CODE",
//         message: "responses.FETCH_SUCCESS",
//         UpdateStatus: {
//           message: message,
//           MessageId: id,
//         },
//       };
//       return resObj;
//     }
//     // }
//   } catch (err) {
//     throw err;
//   }
// };
