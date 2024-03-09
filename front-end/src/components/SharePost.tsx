import React, { useState, useEffect } from "react";
import "./shareButton.css";
import "firebase/firestore";
import { db } from "../utils/firebase";
import { collection, doc } from "firebase/firestore";

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

  useEffect(() => {
  

    // Query Firestore to get the shortened URL
    // db.collection("sharePostLinks")
    //   .doc(postId)
    //   .get()
    //   .then((doc) => {
    //     if (doc.exists) {
    //       const data = doc.data() as CollectionType;
    //       setShortenedLink(data?.shortLink || postLink);
    //     } else {
    //       console.error("Shortened link not found in Firestore");
    //     }
    //   })
    //   .catch((error) => {
    //     console.error("Error getting shortened link from Firestore:", error);
    //   });
  }, [postId, postLink]);

  const createShareableLink = () => {
    const linkToShare = shortenedLink || postLink;
    const encodedTitle = encodeURIComponent(postTitle);
    return `${linkToShare}?postId=${postId}&title=${encodedTitle}`;
  };

  const handleShareClick = async () => {
    const shareableLink = createShareableLink();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Share Post",
          url: shareableLink,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(shareableLink)
        .then(() => {
          console.log("Link copied to clipboard");
        })
        .catch((error) => {
          console.error("Error copying link to clipboard:", error);
        });
    }
  };

  return (
    <div>
      <button className='share-button' onClick={handleShareClick}>Share It</button>
      {shortenedLink && <p>Shortened Link: <a href={shortenedLink} target="_blank" rel="noopener noreferrer">{shortenedLink}</a></p>}
    </div>
  );
};

export default SharePost;

