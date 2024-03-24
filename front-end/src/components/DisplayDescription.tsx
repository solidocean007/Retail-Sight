import { Button, TextField } from "@mui/material";
import { PostType } from "../utils/types";

interface DisplayDescriptionProps {
  post: PostType;
  onNext: () => void;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostType,
    value: PostType[keyof PostType]
  ) => void;
}

export const DisplayDescription: React.FC<DisplayDescriptionProps> = ({
  post,
  onNext,
  onPrevious,
  handleFieldChange,
}) => {
  return (
    <div className="display-description">
      <Button onClick={onPrevious}>Back</Button>
      <TextField
        className="description-box"
        fullWidth
        variant="outlined"
        label="Description"
        minRows={4}
        value={post.description}
        onChange={(e) => handleFieldChange("description", e.target.value)}
      />
      <Button onClick={onNext}>
        <h4>Next</h4>
      </Button>
    </div>
  );
};
