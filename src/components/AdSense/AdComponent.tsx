// AdComponents.tsx
import React, { useEffect } from 'react';

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
    <ins className="adsbygoogle"
         style={{ display: "block", ...style }} // Combine with passed style
         data-ad-client="YOUR_ADSENSE_CLIENT_ID"
         data-ad-slot="YOUR_ADSENSE_SLOT_ID"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  );
};

export default AdComponent;

