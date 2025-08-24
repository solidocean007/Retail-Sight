// ReviewAndSubmit.tsx
import { Backdrop, Box, MenuItem, Select, Typography } from "@mui/material";
import { PostInputType } from "../../utils/types";
import LoadingIndicator from "./LoadingIndicator";

interface ReviewAndSubmitProps {
  companyId?: string;
  post: PostInputType;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostInputType[keyof PostInputType]
  ) => void;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  uploadProgress: number;
  uploadStatusText?: string;
}

export const ReviewAndSubmit: React.FC<ReviewAndSubmitProps> = ({
  post,
  handleFieldChange,
  isUploading,
  uploadProgress,
  uploadStatusText,
}) => {

  return (
    <div className="review-and-submit">
      <Box mt={2}>
        <Typography variant="h6">Post Visibility</Typography>
        <Select
          fullWidth
          variant="outlined"
          value={post.visibility || "public"}
          onChange={(e) => handleFieldChange("visibility", e.target.value)}
        >
          <MenuItem value="public">Public</MenuItem>
          <MenuItem value="company">Company Only</MenuItem>
        </Select>
      </Box>

      <Backdrop
        open={isUploading}
        sx={{ color: "#fff", zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Box textAlign="center">
          <Typography variant="h6" sx={{ mb: 2 }}>
            {uploadStatusText}
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
