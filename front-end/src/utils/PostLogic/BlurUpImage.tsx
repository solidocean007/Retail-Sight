import React, { useState } from "react";

const BlurUpImage = ({ lowResSrc, fullResSrc, alt = "" }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        width: "auto",
        overflow: "hidden",
      }}
    >
      {/* Low-Res Blurred Image */}
      <img
        src={lowResSrc}
        alt={alt}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "cover",
          filter: "blur(5px)",
          transform: "scale(1.05)",
          display: "block",
          transition: "opacity 0.5s ease",
          opacity: loaded ? 0 : 1,
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />

      {/* High-Res Image */}
      <img
        src={fullResSrc}
        alt={alt}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "cover",
          display: "block",
          transition: "opacity 0.5s ease",
          opacity: loaded ? 1 : 0,
        }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export default BlurUpImage;

