import { io } from "socket.io-client";

let socket;

export const initializeSocket = (serverUrl, roomId, onUserConnected, onUserDisconnected, onOffer, onAnswer, onIceCandidate) => {
  socket = io(serverUrl);

  // Sunucuya odaya katılma bilgisi gönder
  socket.emit("join-room", roomId);

  // Yeni kullanıcı bağlandığında tetiklenen olay
  socket.on("user-connected", (userId) => {
    console.log("Yeni kullanıcı bağlandı:", userId);
    if (onUserConnected) onUserConnected(userId);
  });

  // Kullanıcı ayrıldığında tetiklenen olay
  socket.on("user-disconnected", (userId) => {
    console.log("Kullanıcı ayrıldı:", userId);
    if (onUserDisconnected) onUserDisconnected(userId);
  });

  // Gelen offer mesajını işleme
  socket.on("offer", (data) => {
    if (onOffer) onOffer(data);
  });

  // Gelen answer mesajını işleme
  socket.on("answer", (data) => {
    if (onAnswer) onAnswer(data);
  });

  // Gelen ICE candidate mesajını işleme
  socket.on("ice-candidate", (data) => {
    if (onIceCandidate) onIceCandidate(data);
  });
};

// Offer gönderme
export const sendOffer = (to, offer) => {
  if (socket) {
    socket.emit("offer", { to, offer });
  }
};

// Answer gönderme
export const sendAnswer = (to, answer) => {
  if (socket) {
    socket.emit("answer", { to, answer });
  }
};

// ICE candidate gönderme
export const sendIceCandidate = (to, candidate) => {
  if (socket) {
    socket.emit("ice-candidate", { to, candidate });
  }
};

// Socket bağlantısını kapatma
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
