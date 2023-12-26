// SharePost.tsx
import React from 'react';
import './shareButton.css'

interface SharePostProps {
  postLink: string;
  postTitle: string;
  postId: string;
}

const SharePost: React.FC<SharePostProps> = ({ postLink, postTitle, postId }) => {
  
   // Generate the URL with the post ID
   const createShareableLink = () => {
    return `${postLink}?postId=${postId}`;
  };

   const handleShareClick = async () => {
    const shareableLink = createShareableLink();

    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle,
          url: shareableLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for unsupported devices or if Web Share API is not available.
      navigator.clipboard.writeText(shareableLink);
      console.log('Link copied to clipboard');
    }
  };

  return (
    <button className='share-button' onClick={handleShareClick}>Share It</button>
  );
};

export default SharePost;
