import React, { useState } from 'react';

interface ControlsProps {
  onEndCall: () => void;
  isAiSpeaking: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onEndCall, isAiSpeaking }) => {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    // In a real app we would toggle the track enabled state
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
        {/* Status Text */}
        <div className="h-6">
            {isAiSpeaking ? (
                 <p className="text-pink-300 font-medium animate-pulse">Priyanka is speaking...</p>
            ) : (
                 <p className="text-gray-400 text-sm">Listening...</p>
            )}
        </div>

        <div className="flex items-center justify-center space-x-8 w-full max-w-md">
        
        {/* Mute Button */}
        <button 
            onClick={toggleMute}
            className={`p-4 rounded-full text-white shadow-xl transition-all transform hover:scale-105 ${
            isMuted ? 'bg-white text-gray-900' : 'bg-gray-700/80 hover:bg-gray-600 backdrop-blur-md'
            }`}
        >
            {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
            )}
        </button>

        {/* End Call Button */}
        <button 
            onClick={onEndCall}
            className="p-5 bg-red-600 rounded-full text-white shadow-2xl hover:bg-red-700 transition-transform transform hover:scale-110 active:scale-95"
            title="End Call"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
             <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" transform="rotate(135 10 10)"/>
            </svg>
        </button>

        {/* Camera Toggle (Dummy for visual balance) */}
        <button 
            className="p-4 bg-gray-700/80 rounded-full text-white shadow-xl backdrop-blur-md hover:bg-gray-600 transition-all"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
        </button>
        </div>
    </div>
  );
};

export default Controls;