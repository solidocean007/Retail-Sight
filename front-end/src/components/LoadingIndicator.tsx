import React from 'react';
import './LoadingIndicator.css';

interface LoadingIndicatorProps {
  progress: number; // Progress in percentage
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ progress }) => {
  console.log("Loading Indicator Rendered. Progress:", progress);

  return (
    <div className="loading-container">
      <div className="loading-indicator">
        <div className="loading-bar" style={{ width: `${progress}%` }}>
          {progress}% {/* Display the progress for debugging */}
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;

