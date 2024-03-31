import React, { useState, useEffect } from "react";
import "./shareButton.css";
import { getFunctions, httpsCallable } from "firebase/functions";

interface ShareTokenResponse {
  shareToken: string;
  // Include other properties if your function returns more information
}

interface SharePostProps {
  postLink: string;
  postTitle: string;
  postId: string;
}

const SharePost: React.FC<SharePostProps> = ({
  postLink,
  postTitle,
  postId,
}) => {
  const [shortenedLink, setShortenedLink] = useState<string>("");

  // This function will be updated to handle token generation
  const handleShareClick = async () => {
    const functions = getFunctions(); // Initialize Firebase Functions
    const generatePostShareToken = httpsCallable(functions, "generatePostShareToken");

    try {
      // Call the function and wait for the token
      const result = await generatePostShareToken({ postId });
      const token = (result.data as ShareTokenResponse).shareToken; // Assuming the token is returned under 'shareToken' key

      // Construct the shareable link with the token
      const encodedTitle = encodeURIComponent(postTitle);
      const linkToShare = shortenedLink || postLink;
      const shareableLink = `${linkToShare}?postId=${postId}&token=${token}&title=${encodedTitle}`;

      // Proceed with sharing or copying to clipboard
      if (navigator.share) {
        await navigator.share({
          title: "Share Post",
          url: shareableLink,
        });
        console.log("Post shared successfully.");
      } else {
        navigator.clipboard.writeText(shareableLink)
          .then(() => {
            console.log("Link copied to clipboard.");
          })
          .catch((error) => {
            console.error("Error copying link to clipboard:", error);
          });
      }
    } catch (error) {
      console.error("Error generating share token or sharing:", error);
    }
  };

  return (
    <div>
      <button className="share-button" onClick={handleShareClick}>Share It</button>
      {shortenedLink && <p>Shortened Link: <a href={shortenedLink} target="_blank" rel="noopener noreferrer">{shortenedLink}</a></p>}
    </div>
  );
};

export default SharePost;
