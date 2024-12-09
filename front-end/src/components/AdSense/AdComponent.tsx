import React, { useEffect } from "react";
import "./adComponent.css";

interface AdComponentProps {
  className?: string; // New prop for CSS class
  adClient: string; // Your AdSense Client ID
  adSlot: string; // Your AdSense Slot ID
  adFormat?: string; // Optional prop for ad format
  adsOn: boolean;
  placeholder?: JSX.Element; // Optional placeholder element
  style: React.CSSProperties;
}

const AdComponent: React.FC<AdComponentProps> = ({
  className,
  adClient,
  adSlot,
  adFormat = "auto",
  adsOn,
  placeholder,
}) => {
  
  useEffect(() => {
    if (adsOn && window.adsbygoogle) {
      try {
        if (!document.querySelector(`ins[data-ad-slot="${adSlot}"]`)) {
          window.adsbygoogle.push({});
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [adsOn, adSlot]);
  

  if (!adsOn) {
    return placeholder || <div className="ad-placeholder">Ad Placeholder</div>;
  }

  return (
    <div className={`ad-block ${className || ""}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdComponent;

