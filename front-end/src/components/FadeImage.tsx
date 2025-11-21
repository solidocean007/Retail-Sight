import React, { useState } from "react";
import "./fadeImage.css";

interface FadeImageProps {
  srcList: string[];        // fallback chain of URLs
  alt?: string;
  onClick?: () => void;
  className?: string;
}

const FadeImage: React.FC<FadeImageProps> = ({
  srcList,
  alt = "",
  onClick,
  className = "",
}) => {
  const [srcIndex, setSrcIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const currentSrc = srcList[srcIndex];

  return (
    <img
      src={currentSrc}
      alt={alt}
      onClick={onClick}
      className={`fade-image ${loaded ? "fade-image-loaded" : ""} ${className}`}
      onLoad={() => setLoaded(true)}
      onError={() => {
        // Move to next fallback image if available
        if (srcIndex < srcList.length - 1) {
          setLoaded(false); // reset for next attempt
          setSrcIndex(srcIndex + 1);
        }
      }}
    />
  );
};

export default FadeImage;
