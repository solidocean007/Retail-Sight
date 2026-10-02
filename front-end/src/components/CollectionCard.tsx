import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import IosShareOutlinedIcon from "@mui/icons-material/IosShareOutlined";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import type { CSSProperties } from "react";

import { CollectionWithId } from "../utils/types";

import "./collectionCard.css";

type CollectionCardProps = {
  collection: CollectionWithId;
  sharing: boolean;
  onView: (collectionId: string, postCount: number) => void;
  onShare: (collectionId: string, alreadyShareable: boolean) => void;
  onDelete: (collectionId: string) => void;
};

const CollectionCard = ({
  collection,
  sharing,
  onView,
  onShare,
  onDelete,
}: CollectionCardProps) => {
  const previewImages = (collection.previewImages ?? [])
    .filter(Boolean)
    .slice(0, 5);
  const postCount = collection.posts?.length ?? 0;

  return (
    <article className="collection-card">
      <div
        className={`collection-card__preview collection-card__preview--${Math.min(previewImages.length, 5)}`}
      >
        {previewImages.length > 0 ? (
          previewImages.map((imageUrl, index) => {
            const fanPosition = index - (previewImages.length - 1) / 2;

            return (
              <img
                key={`${imageUrl}-${index}`}
                className="collection-card__fan-image"
                src={imageUrl}
                alt=""
                loading="lazy"
                style={
                  {
                    "--collection-fan-x": `${fanPosition * 27}px`,
                    "--collection-fan-rotation": `${fanPosition * 5}deg`,
                    "--collection-fan-z": index + 1,
                  } as CSSProperties
                }
              />
            );
          })
        ) : (
          <div className="collection-card__placeholder">
            <ImageOutlinedIcon />
            <span>Saved displays will appear here</span>
          </div>
        )}

        <span
          className={`collection-card__visibility ${
            collection.isShareableOutsideCompany
              ? "collection-card__visibility--shared"
              : ""
          }`}
        >
          {collection.isShareableOutsideCompany ? (
            <LinkRoundedIcon />
          ) : (
            <LockOutlinedIcon />
          )}
          {collection.isShareableOutsideCompany ? "Link sharing on" : "Private"}
        </span>
      </div>

      <div className="collection-card__body">
        <div className="collection-card__copy">
          <h3>{collection.name || "Untitled collection"}</h3>
          <p>{collection.description || "No description added."}</p>
        </div>

        <div className="collection-card__meta">
          <strong>{postCount.toLocaleString()}</strong>
          <span>post{postCount === 1 ? "" : "s"}</span>
        </div>

        <div className="collection-card__actions">
          <button
            type="button"
            className="collection-card__open"
            disabled={postCount === 0}
            onClick={() => onView(collection.id, postCount)}
          >
            <LaunchRoundedIcon />
            {postCount === 0 ? "Empty collection" : "Open collection"}
          </button>

          <div>
            <Tooltip
              title={
                collection.isShareableOutsideCompany
                  ? "Copy public link"
                  : "Enable and copy public link"
              }
            >
              <span>
                <IconButton
                  aria-label={
                    collection.isShareableOutsideCompany
                      ? `Copy public link for ${collection.name}`
                      : `Enable public link for ${collection.name}`
                  }
                  disabled={sharing}
                  onClick={() =>
                    onShare(collection.id, collection.isShareableOutsideCompany)
                  }
                >
                  {sharing ? (
                    <CircularProgress size={18} />
                  ) : (
                    <IosShareOutlinedIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Delete collection">
              <IconButton
                className="collection-card__delete"
                aria-label={`Delete ${collection.name}`}
                onClick={() => onDelete(collection.id)}
              >
                <DeleteOutlineRoundedIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CollectionCard;
