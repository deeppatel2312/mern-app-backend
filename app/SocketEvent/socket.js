// const {createdChats}=require("../mern-app-backend/app/controllers/chat.controller")
const {
  createdChats,
  sendMessage,
  getCreatedChats,
  getcreatedchat,
  getAllMesg,
} = require("../controllers/chat.controller");

let onlineUser = [];
socketEvent = (socketIo, io) => {
  socketIo.on("connection", (socket) => {
    onlineUser.push(socket);
    console.log(`Socket ${socket.id} connected`);

    socket.on("login", (data) => {
      console.log("use login", data);
      socket.join(data._id);
    });

    //Socket call to create new room
    socket.on("create-new-chat", async (data) => {
      let createChat = await createdChats(data);
      await socket.emit("new-chat-created", createChat);
      // console.log('createChat_________',createChat)
      // let getChats = await getcreatedchat(data);
      // await socket.emit("get-chat", getChats);
    });

    //socket call to list out created rooms
    socket.on("get-chat", async (data) => {
      let getChats = await getcreatedchat(data);
      await socket.emit("show-chats-list", getChats);
      // console.log(getChats,"getChats");
      return false;
    });
    socket.on("get_All_Messages", async (data) => {
      const data2 = {
        userID: data.userId2
      }
      let getmsgs = await getAllMesg(data);
      await socket.emit("chat-message", getmsgs);
      let getChats = await getcreatedchat(data2);
      await socket.emit("show-chats-list", getChats);
      // console.log(getmsgs,"getmsgs");
      return false;
    });

    //socket call to send new message
    socket.on("send-new-message", async (data) => {
      // console.log("Here data===>", data)
      let newMessage = await sendMessage(data);
      let ids = [data.senderID, data.receiversID];
      let data2 = {
        _id: data.roomID,
        userID: data.senderID, //loggedin user id for get chat list
        userId2: data.senderID,
        userId: data.senderID
      };
      const data3 = {
        userID: data.receiversID
      }
      // console.log("newMessage",newMessage)
      ids.forEach((id) => {
        socket.to(id).emit("new-message-read", newMessage);
      });
      // await socketIo.in(ids).emit("new-message-read", newMessage);
      let getmsgs = await getAllMesg(data2);
      ids.forEach(async (id) => {
        await socketIo.to(id).emit("chat-message2", getmsgs);
      });
      let getChats = await getcreatedchat(data2);
      // console.log("chat list", getChats)
      await socketIo.to(data.senderID).emit("show-chats-list", getChats);
      let getChats2 = await getcreatedchat(data3);
      // console.log("chat list", getChats)
      await socketIo.to(data.receiversID).emit("show-chats-list", getChats2);
      // ids.forEach(async (id) => {
      //   await socketIo.to(id).emit("show-chats-list", getChats);
      // });
      // await socket.emit("show-chats-list", getChats);
    });

    socket.on("disconnect", () => {
      console.log(`A user ${socket.id} disconnected`);
    });
  });
};
module.exports = { socketEvent };
