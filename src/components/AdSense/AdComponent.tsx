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
    <div style={{ ...style, textAlign: 'center', padding: '20px', border: '1px dashed #ccc' }}>
      <ins className="adsbygoogle"
           style={{ display: "block" }}
           data-ad-client="YOUR_ADSENSE_CLIENT_ID"
           data-ad-slot="YOUR_ADSENSE_SLOT_ID"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      <p style={{ margin: '10px', color: 'gray', fontSize: '14px' }}>Ad space</p> {/* Always show placeholder */}
    </div>
  );
};

export default AdComponent;

