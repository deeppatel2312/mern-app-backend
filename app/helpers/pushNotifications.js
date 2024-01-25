const admin = require("../config/firebase.config")

// messagingService.js
// This registration token comes from the client FCM SDKs.
// const registrationToken = 'YOUR_REGISTRATION_TOKEN';
function sendPushNotification(payload) {
  const message = {
    notification: {
      title: payload.title,
      body: payload.message,
    },
    token: payload.fcmToken,
    data: {
      type: payload.type
    }
  };

  // Send a message to the device corresponding to the provided
  // registration token.
  return admin.messaging()
    .send(message)
    .then((response) => {
      // Response is a message ID string.
      console.log("Successfully sent message:", response);
    })
    .catch((error) => {
      console.log("Error sending message:", error);
    });
}

module.exports = {
  sendPushNotification,
};
