import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import SocialPostCard from "./SocialPostCard";
import { PostWithID } from "../../utils/types";
import "./socialPostCard.css";

interface Props {
  post: PostWithID;
  variant?: "default" | "menuItem";
}

const ExportDisplayCardButton: React.FC<Props> = ({
  post,
  variant = "default",
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [creating, setCreating] = useState(false);

  const label = creating ? "Creating card..." : "Export display card";

  const handleCreate = async () => {
    if (!cardRef.current || creating) return;

    setCreating(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        imagePlaceholder: "",
      });

      const link = document.createElement("a");
      link.download = `displaygram-display-card-${post.id}.png`;
      link.href = dataUrl;
      link.click();

      await navigator.clipboard.writeText(
        `https://displaygram.com/p/${post.id}`,
      );
    } catch (err) {
      console.error("Failed to create display card:", err);
      alert(
        err instanceof Error ? err.message : "Could not create display card.",
      );
    } finally {
      setCreating(false);
    }
  };

  const hiddenCard = (
    <div className="social-card-hidden-export">
      <div ref={cardRef}>
        <SocialPostCard post={post} />
      </div>
    </div>
  );

  if (variant === "menuItem") {
    return (
      <>
        <MenuItem onClick={handleCreate} disabled={creating}>
          {creating && <CircularProgress size={16} sx={{ mr: 1 }} />}
          {label}
        </MenuItem>
        {hiddenCard}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="create-linkedin-card-button"
        onClick={handleCreate}
        disabled={creating}
      >
        {creating && (
          <CircularProgress size={14} sx={{ mr: 1, color: "white" }} />
        )}
        {label}
      </button>
      {hiddenCard}
    </>
  );
};

export default ExportDisplayCardButton;
