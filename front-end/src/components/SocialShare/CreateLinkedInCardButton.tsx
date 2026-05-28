import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import SocialPostCard from "./SocialPostCard";
import { PostWithID } from "../../utils/types";
import "./socialPostCard.css";
import MenuItem from "@mui/material/MenuItem/MenuItem";

interface Props {
  post: PostWithID;
  variant?: "default" | "menuItem";
}

const CreateLinkedInCardButton: React.FC<Props> = ({ post, variant }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [creating, setCreating] = useState(false);

  const publicUrl = `${window.location.origin}/p/${post.id}`;

  const handleCreate = async () => {
    if (!cardRef.current) return;

    setCreating(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        imagePlaceholder: "",
      });

      const link = document.createElement("a");
      link.download = `displaygram-linkedin-card-${post.id}.png`;
      link.href = dataUrl;
      link.click();

      await navigator.clipboard.writeText(publicUrl);

      await navigator.clipboard.writeText(publicUrl);

      alert("LinkedIn card downloaded and public link copied to clipboard.");
    } catch (err) {
      console.error("Failed to create LinkedIn card:", err);
      alert(
        err instanceof Error ? err.message : "Could not create LinkedIn card.",
      );
    } finally {
      setCreating(false);
    }
  };

  if (variant === "menuItem") {
    return (
      <>
        <MenuItem onClick={handleCreate}>Create LinkedIn Card</MenuItem>

        <div className="social-card-hidden-export">
          <div ref={cardRef}>
            <SocialPostCard post={post} />
          </div>
        </div>
      </>
    );
  }
};

export default CreateLinkedInCardButton;
