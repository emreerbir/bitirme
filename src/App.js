import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const [roomId, setRoomId] = useState("");
  const [inputRoomId, setInputRoomId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
  const [hasToken, setHasToken] = useState(false);
  const [tokenId, setTokenId] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(7);
    setRoomId(newRoomId);
    setIsConnected(true);
    setTokenId(Math.random().toString(36).substring(7));
    startLocalStream();
  };

  const joinRoom = () => {
    if (inputRoomId.trim()) {
      setRoomId(inputRoomId);
      setIsConnected(true);
      setTokenId(Math.random().toString(36).substring(7));
      startLocalStream();
    }
  };

  const claimToken = () => {
    setHasToken(true);
    startRecording();
  };

  const releaseToken = () => {
    setHasToken(false);
    stopRecording();
  };

  const startRecording = () => {
    if (!localStream) return;

    chunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(localStream);
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      chunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, "video.webm");
      formData.append("src_lang", "tur");
      formData.append("target_language_for_mt", "eng");

      try {
        await uploadVideo(formData);
      } catch (error) {
        console.error("Error uploading video:", error);
      }
    };

    mediaRecorderRef.current.start();
    setInterval(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.start();
      }
    }, 5000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadVideo = async (formData) => {
    try {
      const response = await axios.post(
        "https://b83a-34-143-198-121.ngrok-free.app/full-pipeline",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("Video uploaded successfully:", response.data);
    } catch (error) {
      console.error("Error uploading video:", error);
    }
  };

  return (
    <div className="app-container">
      {!isConnected ? (
        <div className="landing-page">
          <h1>Video Conferencing App</h1>
          <div className="create-room">
            <button onClick={createRoom}>Create Meeting Room</button>
          </div>
          <div className="join-room">
            <input
              type="text"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value)}
              placeholder="Enter Meeting ID"
            />
            <button onClick={joinRoom}>Join Room</button>
          </div>
        </div>
      ) : (
        <div className="meeting-room">
          <div className="room-info">
            <h2>Meeting Room: {roomId}</h2>
            <div className="token-section">
              <h3>Token ID: {tokenId}</h3>
              {!hasToken ? (
                <button onClick={claimToken}>Claim Token</button>
              ) : (
                <button onClick={releaseToken}>Release Token</button>
              )}
            </div>
          </div>
          <div className="video-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={!hasToken}
              className="video-player"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
