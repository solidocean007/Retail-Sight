import React, { useState, useEffect, useRef } from "react";
import "./fadeImage.css";

interface FadeImageProps {
  srcList: string[];       // ordered: [200, 800, 1200, original]
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
  const [currentSrc, setCurrentSrc] = useState(srcList[0]);
  const [loaded, setLoaded] = useState(false);

  // Ensures Virtuoso row reuse doesn't cause re-fades
  const lastListRef = useRef<string[]>([]);

  // Reset only when the post's srcList truly changes
  useEffect(() => {
    const same =
      lastListRef.current.length === srcList.length &&
      lastListRef.current.every((v, i) => v === srcList[i]);

    if (!same) {
      lastListRef.current = srcList;
      setCurrentSrc(srcList[0]);
      setLoaded(false);
    }
  }, [srcList]);

  // Load the currentSrc + begin fallback chain
  useEffect(() => {
    let cancelled = false;

    const load = (index: number) => {
      if (index >= srcList.length) return;

      const url = srcList[index];
      const img = new Image();
      img.src = url;

      if (img.complete) {
        if (!cancelled) {
          setCurrentSrc(url);
          setLoaded(true);
        }
        return;
      }

      img.onload = () => {
        if (!cancelled) {
          setCurrentSrc(url);
          setLoaded(true);
          // Load next variant AFTER the sharp one is shown
          if (index + 1 < srcList.length) load(index + 1);
        }
      };

      img.onerror = () => {
        if (!cancelled && index + 1 < srcList.length) {
          load(index + 1);
        }
      };
    };

    load(0);

    return () => {
      cancelled = true;
    };
  }, [srcList]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      onClick={onClick}
      className={`fade-image ${loaded ? "fade-image-loaded" : ""} ${className}`}
      draggable="false"
    />
  );
};

export default FadeImage;
