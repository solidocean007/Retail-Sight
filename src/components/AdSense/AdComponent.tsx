// AdComponents.tsx
import React, { useEffect } from "react";
import "./adComponent.css";

interface AdComponentProps {
  style: React.CSSProperties;
}

const AdComponent: React.FC<AdComponentProps> = ({ style }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <div
      className="ad-block"
      style={{
        ...style,
        textAlign: "center",
        padding: "20px",
        border: "1px dashed #ccc",
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="YOUR_ADSENSE_CLIENT_ID"
        data-ad-slot="YOUR_ADSENSE_SLOT_ID"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
      {/* <h1 style={{ margin: "20px", color: "gray", fontSize: "25px" }}> */}
      <h2>
        Ad space placeholder. Keep scrolling.
      </h2>
      {/* Always show placeholder */}
    </div>
  );
};

export default AdComponent;
