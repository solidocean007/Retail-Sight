import {
  Backdrop,
  Box,
  FormHelperText,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import { PostInputType } from "../../utils/types";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LoadingIndicator from "./LoadingIndicator";

interface ReviewAndSubmitProps {
  companyId?: string;
  post: PostInputType;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostInputType[keyof PostInputType],
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
  const shareNote = post.shareNote?.trim();

  return (
    <div className="review-and-submit">
      {shareNote && post.account?.originCompanyId && (
        <Box
          mt={2}
          p={2}
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "var(--input-background)",
          }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            Message for{" "}
            {post.account.originCompanyName || "the connected distributor"}
          </Typography>
          <Typography
            variant="body2"
            mt={0.5}
            sx={{ whiteSpace: "pre-wrap" }}
          >
            {shareNote}
          </Typography>
        </Box>
      )}

      <Box mt={2}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
          Post Visibility
          <Tooltip
            title={
              <>
                <strong>Network</strong>: Shared with connected suppliers
                <br />
                <strong>Company Only</strong>: Visible only inside your company
              </>
            }
            placement="right"
            arrow
          >
            <IconButton size="small">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>

        <Select
          fullWidth
          variant="outlined"
          value={post.migratedVisibility ?? "network"}
          onChange={(event) =>
            handleFieldChange("migratedVisibility", event.target.value)
          }
        >
          <MenuItem value="network">Network (default)</MenuItem>
          <MenuItem value="companyOnly">Company Only</MenuItem>
        </Select>

        <FormHelperText>
          <strong>Network</strong> = shared with connected suppliers <br />
          <strong>Company Only</strong> = internal to only your company
        </FormHelperText>
      </Box>

      <Backdrop
        open={isUploading}
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
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
