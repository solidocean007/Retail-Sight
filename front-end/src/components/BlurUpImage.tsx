import React, { useState } from "react";
import './blurUpImage.css';

interface BlurUpImageProps {
  lowResSrc: string;
  fullResSrc: string;
  alt?: string;
}

const BlurUpImage: React.FC<BlurUpImageProps> = ({ lowResSrc, fullResSrc, alt = "" }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="blur-up-image-wrapper">
      <img
        src={lowResSrc}
        alt={alt}
        className={`blur-up-image post-image low-res ${loaded ? "hidden" : ""}`}
      />
      <img
        src={fullResSrc}
        alt={alt}
        className={`blur-up-image post-image full-res ${loaded ? "visible" : "hidden"}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export default BlurUpImage;

