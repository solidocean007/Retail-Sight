// FadeImage.tsx — optimized blur-first, no 200px, Virtuoso-safe
import React, { useState, useEffect, useRef } from "react";
import "./fadeImage.css";

interface FadeImageProps {
  srcList: string[]; // e.g. [800, 600, original]
  alt?: string;
  className?: string;
  onClick?: () => void;
}

const FadeImage: React.FC<FadeImageProps> = ({
  srcList,
  alt = "",
  className = "",
  onClick,
}) => {
  // First source to try
  const [srcIndex, setSrcIndex] = useState(0);

  // Loaded = sharp; not loaded = blurred
  const [loaded, setLoaded] = useState(false);

  // Track last srcList identity to avoid stale state in Virtuoso recycling
  const listRef = useRef<string[] | null>(null);

  // -------------------------------------------------------
  // When a new post arrives (srcList changes), RESET everything
  // Virtuoso reuses rows → this is critical
  // -------------------------------------------------------
  useEffect(() => {
    if (listRef.current !== srcList) {
      listRef.current = srcList;
      setSrcIndex(0);
      setLoaded(false);
    }
  }, [srcList]);

  const url = srcList[srcIndex];

  // -------------------------------------------------------
  // Loader for each URL
  // -------------------------------------------------------
  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    const img = new Image();

    img.onload = () => {
      if (!cancelled) {
        setLoaded(true);
      }
    };

    img.onerror = () => {
      if (cancelled) return;

      // Fallback to next candidate
      if (srcIndex < srcList.length - 1) {
        setLoaded(false);
        setSrcIndex((i) => i + 1);
      }
    };

    img.src = url;

    // If already in memory/SW cache, trigger immediately
    if (img.complete) {
      img.onload?.(null as any);
    }

    return () => {
      cancelled = true;
    };
  }, [url, srcIndex, srcList]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt={alt}
      className={`fade-image ${loaded ? "fade-image-loaded" : ""} ${className}`}
      onClick={onClick}
      draggable="false"
    />
  );
};

export default FadeImage;
