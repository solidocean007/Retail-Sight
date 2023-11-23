import React, { useEffect } from 'react';

interface AdComponentProps {
  style: React.CSSProperties; // Add style to the props for AdComponent
}

const AdComponent: React.FC<AdComponentProps> = ({ style }) => {
  useEffect(() => {
    if (window.adsbygoogle && process.env.NODE_ENV !== 'development') { // process is not defined
      window.adsbygoogle.push({});
    }
  }, []);

  return (
    <div style={style}>Ad Placeholder</div> // Simple placeholder for an ad
    // <ins className="adsbygoogle"
    //      style={{ display: "block" }}
    //      data-ad-client="YOUR_ADSENSE_CLIENT_ID"
    //      data-ad-slot="YOUR_ADSENSE_SLOT_ID"
    //      data-ad-format="auto"
    //      data-full-width-responsive="true"></ins>
  );
};

export default AdComponent;
