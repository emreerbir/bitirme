import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  initializeSocket,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
  disconnectSocket,
} from "./utils/socket"; // Socket kodları burada tanımlandı

// App bileşeni, uygulamanın ana bileşeni
const App = () => {
  const [roomId, setRoomId] = useState(""); // Oda ID'si
  const [isConnected, setIsConnected] = useState(false); // Bağlantı durumu
  const [localStream, setLocalStream] = useState(null); // Yerel video ve ses akışı
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null); // İşlenmiş video URL'si
  const videoRef = useRef(null); // Kullanıcı videosu için referans
  const peerConnections = useRef({}); // WebRTC bağlantıları
  const [remoteStreams, setRemoteStreams] = useState([]); // Uzak kullanıcıların akışları
  const [videoQueue, setVideoQueue] = useState([]); // Kuyruk yapısı
  const [isPlaying, setIsPlaying] = useState(false); // Şu anda bir video oynatılıyor mu
  const [isProcessing, setIsProcessing] = useState(false); // İşleme durumu
  const intervalRef = useRef(null); // setInterval referansı
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null); // Oynatılan video URL'si

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
    const mediaRecorder = new MediaRecorder(localStream, {
      mimeType: "video/mp4;codecs=avc1,mp4a.40.2",
    });
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
          "https://ed11-35-230-7-101.ngrok-free.app/full-pipeline",
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

        // Videoyu kuyruğa ekle
        setVideoQueue((prevQueue) => [...prevQueue, videoUrl]);
      } catch (err) {
        console.error("Error uploading video:", err);
      }
    };

    // Video kaydını başlat ve sonra durdur
    mediaRecorder.start();
    setTimeout(() => {
      mediaRecorder.stop();
    }, 8000); // 8 saniye boyunca kaydet
  };

  const startProcessing = () => {
    if (isProcessing) return; // Zaten işlem devam ediyorsa tekrar başlatma
    setIsProcessing(true);

    // Her 8 saniyede bir video yükleme işlemi başlat
    intervalRef.current = setInterval(() => {
      uploadVideo();
    }, 8000);

    uploadVideo(); // İlk isteği hemen yap
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 3. Konferans Özelliği: WebRTC bağlantısını oluştur
  const createPeerConnection = (userId) => {
    const peerConnection = new RTCPeerConnection();
    peerConnections.current[userId] = peerConnection;

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams((prev) => [...prev, { userId, stream }]);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendIceCandidate(userId, event.candidate);
      }
    };

    return peerConnection;
  };

  // 4. Konferans Özelliği: Socket olayları
  const joinRoom = () => {
    initializeSocket(
      "localhost:5000",
      roomId,
      (userId) => {
        const peerConnection = createPeerConnection(userId);
        peerConnection.createOffer().then((offer) => {
          peerConnection.setLocalDescription(offer);
          sendOffer(userId, offer);
        });
      },
      (userId) => {
        setRemoteStreams((prev) =>
          prev.filter((stream) => stream.userId !== userId)
        );
        const peerConnection = peerConnections.current[userId];
        if (peerConnection) {
          peerConnection.close();
          delete peerConnections.current[userId];
        }
      },
      async ({ from, offer }) => {
        const peerConnection = createPeerConnection(from);
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendAnswer(from, answer);
      },
      ({ from, candidate }) => {
        const peerConnection = peerConnections.current[from];
        if (peerConnection) {
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    );
  };

  // Kuyruğa eklenen videoları sırayla oynatma
  useEffect(() => {
    if (!isPlaying && videoQueue.length > 0) {
      setIsPlaying(true);
      const nextVideoUrl = videoQueue[0];
      setCurrentVideoUrl(nextVideoUrl);
      setVideoQueue((prevQueue) => prevQueue.slice(1)); // Kuyruğun ilk elemanını çıkar
    }
  }, [videoQueue, isPlaying]);

  // Video bittiğinde isPlaying'i false yap
  const handleVideoEnded = () => {
    setIsPlaying(false);
    setCurrentVideoUrl(null);
  };

  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Konferans ve Video İşleme Uygulaması</h1>
      <div style={{ marginBottom: "10px" }}>
        <label>
          Oda ID'si:
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
        </label>
        <button
          onClick={() => {
            if (roomId.trim()) {
              setIsConnected(true);
              startLocalStream();
              joinRoom();
            } else {
              alert("Lütfen bir oda ID'si girin.");
            }
          }}
        >
          Odaya Katıl
        </button>
      </div>
      <div>
        <h3>Kendi Görüntünüz</h3>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "300px" }}
        />
      </div>
      {isConnected && (
        <div style={{ marginTop: "20px" }}>
          {!isProcessing ? (
            <button onClick={startProcessing}>Videoyu İşle</button>
          ) : (
            <button onClick={stopProcessing}>Video İşlemeyi Durdur</button>
          )}
        </div>
      )}
      <div id="processed-video-container" style={{ marginTop: "20px" }}>
        <h3>İşlenmiş Video</h3>
        {currentVideoUrl && (
          <video
            src={currentVideoUrl}
            controls
            autoPlay
            onEnded={handleVideoEnded}
            style={{ width: "300px" }}
          />
        )}
      </div>
      {remoteStreams.map(({ userId, stream }) => (
        <div key={userId}>
          <h3>Kullanıcı: {userId}</h3>
          <video
            autoPlay
            playsInline
            muted={false}
            style={{ width: "300px" }}
            ref={(videoElement) => {
              if (videoElement) {
                videoElement.srcObject = stream;
              }
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default App;