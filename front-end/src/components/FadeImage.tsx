import React, { useState, useEffect } from "react";
import "./fadeImage.css";

interface FadeImageProps {
  srcList: string[];
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

  const url = srcList[srcIndex];

  useEffect(() => {
    const img = new Image();
    img.src = url;

    // 🚀 Instant-load check (best possible)
    if (img.complete) {
      setLoaded(true);
      return;
    }

    // 🎨 Smooth decode attempt (no jank)
    if ("decode" in img && img.onload) {
      img.decode()
        .then(() => setLoaded(true))
        .catch(() => setLoaded(true));
    } else {
      img.onload = () => setLoaded(true);
    }

    img.onerror = () => {
      // Switch to next fallback if present
      if (srcIndex < srcList.length - 1) {
        setLoaded(false);
        setSrcIndex((old) => old + 1);
      }
    };
  }, [url]);

  return (
    <img
      src={url}
      alt={alt}
      onClick={onClick}
      className={`fade-image ${loaded ? "fade-image-loaded" : ""} ${className}`}
      draggable="false"
    />
  );
};

export default FadeImage;
