import React from 'react';
import { Button } from "@mui/material";

interface SharePostProps {
  postLink: string;
  postTitle: string;
}

const SharePost: React.FC<SharePostProps> = ({ postLink, postTitle }) => {
  
  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle,
          url: postLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for unsupported devices.
      console.log('Web Share API not supported. Provide a fallback here.');
    }
  };

  return (
    <Button onClick={handleShareClick}>Share It</Button>
  );
};

export default SharePost;
