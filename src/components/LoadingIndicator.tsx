import React from 'react';
import './LoadingIndicator.css';

interface LoadingIndicatorProps {
  progress: number; // Progress in percentage
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ progress }) => {
  return (
    <div className="loading-indicator">
      <div className="loading-bar" style={{ width: `${progress}%` }}></div>
    </div>
  );
};

export default LoadingIndicator;
