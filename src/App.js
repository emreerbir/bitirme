import React, { useState, useEffect, useRef } from "react";
import axios from "axios";


// App bileşeni, uygulamanın ana bileşeni
const App = () => {
  const [roomId, setRoomId] = useState(""); // Oda ID'si
  const [isConnected, setIsConnected] = useState(false); // Bağlantı durumu
  const [localStream, setLocalStream] = useState(null); // Yerel video ve ses akışı
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null); // İşlenmiş video URL'si
  const videoRef = useRef(null); // Kullanıcı videosu için referans

  // Kullanıcının kamera ve mikrofonuna erişim
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


  // Videoyu backend'e gönderme ve işlenmiş videoyu alma
  const uploadVideo = async () => {
    if (!localStream) {
      alert("Lütfen önce kamerayı açın.");
      return;
    }

    // Akışı bir blob olarak kaydetmek
    const mediaRecorder = new MediaRecorder(localStream, { mimeType: "video/mp4;codecs=avc1,mp4a.40.2" });
    const chunks = [];
    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {

      const blob = new Blob(chunks, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, "video.webm");

      formData.append("src_lang", "tur");
      formData.append("target_language_for_mt", "eng");
      formData.append("target_language_for_tts", "en");

      try {
        const response = await axios.post(
          "https://13c9-34-80-109-112.ngrok-free.app/full-pipeline",
          formData,
          {
            headers: {
              Accept: "*/*",
              "User-Agent": "Axios/1.0",
              Connection: "keep-alive", // Bağlantıyı açık tut
            },
            responseType: "arraybuffer", // Binary data almak için
          }
        );
  
        console.log("Response:", response.data);
        console.log("Processed video URL:", response.data.processed_file);
        console.log("Translated text:", response);

        // Backend'den gelen binary video verisini URL'ye dönüştür
        const videoBlob = new Blob([response.data], { type: "video/mp4" });
        const videoUrl = URL.createObjectURL(videoBlob);
        setProcessedVideoUrl(videoUrl);

        //setProcessedVideoUrl(response.data.processed_file); // İşlenmiş video URL'sini kaydet
        } catch (err) {
        console.error("Error uploading video:", err);
      }
    };

    // Video kaydını başlat ve sonra durdur
    mediaRecorder.start();
    setTimeout(() => {
      mediaRecorder.stop();
    }, 20000); // 5 saniye boyunca kaydet
  };

  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Video İşleme Uygulaması</h1>
      <div style={{ marginBottom: "10px" }}>
        <label>
          Oda ID'si:
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{ marginLeft: "10px" }}
          />
        </label>
        <button
          onClick={() => {
            if (roomId.trim()) {
              setIsConnected(true);
              startLocalStream();
            } else {
              alert("Lütfen bir oda ID'si girin.");
            }
          }}
          style={{ marginLeft: "10px" }}
        >
          Odaya Katıl
        </button>
      </div>
      <div>
        <h3>Kendi Görüntünüz</h3>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "300px" }} />
      </div>
      {isConnected && (
        <div style={{ marginTop: "20px" }}>
          <button onClick={uploadVideo}>Videoyu İşle</button>
        </div>
      )}
      {processedVideoUrl && (
        <div style={{ marginTop: "20px" }}>
          <h3>İşlenmiş Video</h3>
          <video src={processedVideoUrl} controls style={{ width: "300px" }} />
        </div>
      )}
    </div>
  );
};

export default App;
