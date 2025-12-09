import React from 'react';
import VideoInterface from './components/VideoInterface';

const App: React.FC = () => {
  return (
    <div className="h-full w-full relative bg-black">
      {/* We assume the user is 'calling' Priyanka */}
      <VideoInterface />
    </div>
  );
};

export default App;