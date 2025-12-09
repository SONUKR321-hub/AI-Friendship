
import React, { useState, useEffect, useRef } from 'react';
import { CallStatus } from '../types';
import { LiveClient } from '../services/liveService';
import Controls from './Controls';

// A more "selfie-style" portrait for better realism
const AVATAR_URL = "https://picsum.photos/id/338/800/1200"; 

const VideoInterface: React.FC = () => {
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [showRoastOverlay, setShowRoastOverlay] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveClientRef = useRef<LiveClient | null>(null);

  // Initialize Live Client
  useEffect(() => {
    liveClientRef.current = new LiveClient();
    
    liveClientRef.current.onAudioData = (playing) => {
      setIsAiSpeaking(playing);
    };

    liveClientRef.current.onVolumeLevel = (level) => {
      // Smooth the volume level for visualization
      setMicVolume(prev => prev * 0.8 + level * 20.0);
    };

    liveClientRef.current.onImageGenerated = (url) => {
      setShowRoastOverlay(url);
      setTimeout(() => setShowRoastOverlay(null), 8000);
    };

    return () => {
      liveClientRef.current?.disconnect();
    };
  }, []);

  const handleStartCall = async () => {
    try {
      setStatus(CallStatus.CONNECTING);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, 
        audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Pass the video element to the connect method so the AI can "see"
      await liveClientRef.current?.connect(stream, videoRef.current || undefined);
      
      setStatus(CallStatus.ACTIVE);
    } catch (err) {
      console.error("Failed to start call", err);
      setStatus(CallStatus.IDLE);
      alert("Could not access camera/microphone. Permissions needed for video call.");
    }
  };

  const handleEndCall = () => {
    setStatus(CallStatus.ENDED);
    liveClientRef.current?.disconnect();
    
    if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
    }

    setTimeout(() => setStatus(CallStatus.IDLE), 2000);
  };

  if (status === CallStatus.IDLE || status === CallStatus.ENDED) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 bg-opacity-95 text-center p-6" 
           style={{
             backgroundImage: `url(${AVATAR_URL})`,
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundBlendMode: 'multiply'
           }}>
        <div className="bg-black/40 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-2xl animate-in fade-in zoom-in duration-500">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-pink-500 mx-auto mb-6 shadow-[0_0_20px_rgba(236,72,153,0.6)]">
            <img src={AVATAR_URL} alt="Priyanka" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Priyanka ❤️</h1>
            <p className="text-pink-300 mb-8 font-medium">Incoming Video Call...</p>
            
            <button 
            onClick={handleStartCall}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full p-6 transition-all transform hover:scale-110 shadow-lg animate-pulse"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-gray-900">
      <style>{`
        @keyframes float {
          0% { transform: scale(1.1) translate(0px, 0px); }
          33% { transform: scale(1.1) translate(-10px, 5px); }
          66% { transform: scale(1.1) translate(5px, -5px); }
          100% { transform: scale(1.1) translate(0px, 0px); }
        }
        @keyframes talking {
          0% { transform: scale(1.1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1.1); }
        }
        .handheld-cam {
          animation: float 8s ease-in-out infinite;
        }
        .talking-anim {
          animation: talking 0.3s ease-in-out infinite alternate;
        }
        .video-grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* 1. Main Background (Priyanka) - Acts as her video feed */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-black overflow-hidden">
        {/* Container for the image to handle transforms */}
        <div className={`relative w-full h-full transition-transform duration-100 ${isAiSpeaking ? 'talking-anim' : 'handheld-cam'}`}>
            <img 
                src={AVATAR_URL} 
                alt="Priyanka" 
                className="w-full h-full object-cover filter brightness-90 contrast-110"
            />
        </div>
        
        {/* Video Overlay Effects (Grain & Vignette) */}
        <div className="absolute inset-0 video-grain pointer-events-none opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>
        
        {/* Speaking Visual Indicator (Subtle glow) */}
        {isAiSpeaking && (
             <div className="absolute inset-0 bg-pink-500/10 mix-blend-overlay animate-pulse pointer-events-none"></div>
        )}
      </div>

      {/* 2. Connection Status / Hint Overlay */}
      {status === CallStatus.CONNECTING ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-xl font-semibold">Connecting secure line to Patna...</p>
          </div>
        </div>
      ) : (
          /* Hint to speak if silent */
          !isAiSpeaking && micVolume < 0.1 && (
             <div className="absolute top-1/4 left-0 right-0 text-center z-20 pointer-events-none">
                 <span className="bg-black/40 text-white/80 px-4 py-2 rounded-full text-sm backdrop-blur-md animate-bounce">
                     Say "Hello baby"...
                 </span>
             </div>
          )
      )}

      {/* 3. Roast Overlay */}
      {showRoastOverlay && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 animate-in fade-in duration-300 p-4">
            <div className="relative max-w-sm w-full bg-white p-2 rounded-lg transform rotate-2 shadow-2xl border-4 border-yellow-400">
                <img src={showRoastOverlay} alt="Roast" className="w-full rounded" />
                <div className="absolute -bottom-10 left-0 right-0 text-center">
                    <span className="bg-yellow-400 text-black font-bold px-4 py-1 rounded-full text-lg shadow-lg">
                        ROASTED! 🔥
                    </span>
                </div>
            </div>
        </div>
      )}

      {/* 4. Self View (Real Camera) */}
      <div className="absolute top-4 right-4 w-28 h-40 bg-black rounded-xl overflow-hidden border border-white/30 shadow-2xl z-20 group">
         <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover mirror-mode"
            style={{ transform: 'scaleX(-1)' }} 
         />
         {/* Mic Visualizer Overlay on Self View */}
         <div className="absolute bottom-2 left-2 flex items-end space-x-1 h-4">
             <div className="w-1 bg-green-500 rounded-t" style={{ height: `${Math.min(100, micVolume * 100)}%`, transition: 'height 0.1s' }}></div>
             <div className="w-1 bg-green-500 rounded-t" style={{ height: `${Math.min(100, micVolume * 80)}%`, transition: 'height 0.1s' }}></div>
             <div className="w-1 bg-green-500 rounded-t" style={{ height: `${Math.min(100, micVolume * 120)}%`, transition: 'height 0.1s' }}></div>
         </div>
      </div>

      {/* 5. Header Info */}
      <div className="absolute top-6 left-6 z-20 flex items-center space-x-3 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
          <span className="text-white/90 font-mono text-xs tracking-widest">VIDEO CALL • HD</span>
      </div>

      {/* 6. Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-30">
          <Controls 
            onEndCall={handleEndCall} 
            isAiSpeaking={isAiSpeaking}
          />
      </div>
    </div>
  );
};

export default VideoInterface;
