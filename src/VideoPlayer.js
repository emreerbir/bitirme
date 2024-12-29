import React, { useState } from "react";
import axios from "axios";

const VideoPlayer = () => {
  const [videoUrl, setVideoUrl] = useState(null);

  const fetchVideo = async () => {
    try {
      const response = await axios.post(
        "https://b83a-34-143-198-121.ngrok-free.app/full-pipeline",
        {}, // Eğer POST isteğinde bir body gerekiyorsa ekleyin
        {
          responseType: "arraybuffer", // Veriyi binary formatında almak için
        }
      );

      // Binary veriyi Blob formatına dönüştürme
      const videoBlob = new Blob([response.data], { type: "video/mp4" });

      // Blob'dan URL oluşturma
      const videoObjectUrl = URL.createObjectURL(videoBlob);

      // Oluşturulan URL'yi state'e kaydet
      setVideoUrl(videoObjectUrl);
    } catch (err) {
      console.error("Error fetching video:", err);
    }
  };

  return (
    <div>
      <button onClick={fetchVideo}>Fetch and Play Video</button>
      {videoUrl && (
        <video controls width="600">
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
};

export default VideoPlayer;