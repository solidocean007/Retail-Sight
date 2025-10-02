import React, { useEffect, useState } from "react";
import "./blurUpImage.css";

interface BlurUpImageProps {
  lowResSrc: string;
  fullResSrc: string;
  alt?: string;
  openImageModal: () => void;
}

const BlurUpImage: React.FC<BlurUpImageProps> = ({
  lowResSrc,
  fullResSrc,
  alt = "",
  openImageModal,
}) => {
  const [HiRezLoaded, setHiRezLoaded] = useState(false);
  const [hiResReady, setHiResReady] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = fullResSrc;
    img.onload = () => setHiResReady(true);
  }, [fullResSrc]);

  return (
    <div className="blur-up-image-wrapper">
      {!HiRezLoaded && !hiResReady && (
        <img
          src={lowResSrc}
          alt={alt}
          className="blur-up-image post-image low-res"
          style={{ objectFit: "contain" }}
        />
      )}
      {hiResReady && (
        <img
          src={fullResSrc}
          alt={alt}
          className="blur-up-image post-image full-res"
          onLoad={() => setHiRezLoaded(true)}
          onClick={openImageModal}
          style={{ objectFit: "contain" }}
        />
      )}
    </div>
  );
};

export default BlurUpImage;
