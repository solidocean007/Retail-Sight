import { Backdrop, Box, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

import { PostInputType } from "../../utils/types";
import LoadingIndicator from "./LoadingIndicator";

import "./reviewAndSubmit.css";

interface ReviewAndSubmitProps {
  post: PostInputType;
  handleFieldChange: <K extends keyof PostInputType>(
    field: K,
    value: PostInputType[K],
  ) => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatusText?: string;
  onEditStep: (step: number) => void;
}

const ReviewSection = ({
  title,
  step,
  onEditStep,
  children,
}: {
  title: string;
  step: number;
  onEditStep: (step: number) => void;
  children: React.ReactNode;
}) => (
  <section className="post-review-section">
    <header>
      <h3>{title}</h3>
      <button type="button" onClick={() => onEditStep(step)}>
        <EditOutlinedIcon />
        Edit
      </button>
    </header>
    {children}
  </section>
);

export const ReviewAndSubmit: React.FC<ReviewAndSubmitProps> = ({
  post,
  handleFieldChange,
  isUploading,
  uploadProgress,
  uploadStatusText,
  onEditStep,
}) => {
  const displayName =
    [post.postUser?.firstName, post.postUser?.lastName]
      .filter(Boolean)
      .join(" ") || "Current user";
  const shareNote = post.shareNote?.trim();

  return (
    <div className="review-and-submit">
      <div className="post-review-intro">
        <span>Ready to publish</span>
        <h2>Review the display</h2>
        <p>Confirm the store, products, and goal before publishing.</p>
      </div>

      <ReviewSection title="Photo" step={1} onEditStep={onEditStep}>
        <div className="post-review-photo">
          {post.imageUrl ? (
            <img src={post.imageUrl} alt="Selected retail display" />
          ) : (
            <span>No photo selected</span>
          )}
        </div>
      </ReviewSection>

      <ReviewSection title="Store and goal" step={2} onEditStep={onEditStep}>
        <dl className="post-review-facts">
          <div>
            <dt>Account</dt>
            <dd>{post.account?.accountName || "No account selected"}</dd>
          </div>
          <div>
            <dt>Account number</dt>
            <dd>{post.account?.accountNumber || "Not available"}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{post.account?.accountAddress || "Not available"}</dd>
          </div>
          <div>
            <dt>Posting for</dt>
            <dd>{displayName}</dd>
          </div>
          <div>
            <dt>Company goal</dt>
            <dd>{post.companyGoalTitle || "No company goal"}</dd>
          </div>
          <div>
            <dt>Gallo goal</dt>
            <dd>{post.galloGoal?.title || "No Gallo goal"}</dd>
          </div>
        </dl>
      </ReviewSection>

      <ReviewSection title="Display details" step={3} onEditStep={onEditStep}>
        <dl className="post-review-facts">
          <div>
            <dt>Brands</dt>
            <dd>{post.brands?.join(", ") || "None selected"}</dd>
          </div>
          <div>
            <dt>Product types</dt>
            <dd>{post.productType?.join(", ") || "None selected"}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{post.totalCaseCount}</dd>
          </div>
          <div className="post-review-facts__wide">
            <dt>Description</dt>
            <dd>{post.description?.trim() || "No description"}</dd>
          </div>
          {shareNote && post.account?.originCompanyId && (
            <div className="post-review-facts__wide">
              <dt>
                Message for{" "}
                {post.account.originCompanyName || "connected distributor"}
              </dt>
              <dd>{shareNote}</dd>
            </div>
          )}
        </dl>
      </ReviewSection>

      <section className="post-review-visibility">
        <div>
          <h3>Visibility</h3>
          <p>
            Network posts can be shared with approved connected companies when
            their brand settings match.
          </p>
        </div>
        <div className="post-review-visibility__options" role="radiogroup">
          <label>
            <input
              type="radio"
              name="post-visibility"
              value="network"
              checked={(post.migratedVisibility ?? "network") === "network"}
              onChange={() =>
                handleFieldChange("migratedVisibility", "network")
              }
            />
            <span>
              <strong>Network</strong>
              <small>Eligible connected companies may see this display.</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="post-visibility"
              value="companyOnly"
              checked={post.migratedVisibility === "companyOnly"}
              onChange={() =>
                handleFieldChange("migratedVisibility", "companyOnly")
              }
            />
            <span>
              <strong>Company only</strong>
              <small>Keep this display inside your company.</small>
            </span>
          </label>
        </div>
      </section>

      <Backdrop
        open={isUploading}
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Box textAlign="center" className="post-publish-progress">
          <Typography variant="h6" sx={{ mb: 2 }}>
            {uploadStatusText || "Publishing display…"}
          </Typography>
          <LoadingIndicator progress={uploadProgress} />
          <Typography variant="body2" sx={{ mt: 2, fontWeight: "bold" }}>
            {Math.round(uploadProgress)}%
          </Typography>
        </Box>
      </Backdrop>
    </div>
  );
};
