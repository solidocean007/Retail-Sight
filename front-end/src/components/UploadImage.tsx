import { Button } from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import { PostType } from "../utils/types";
import './uploadimage.css'

interface UploadImageProps {
  onNext: () => void;
  post: PostType;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadImage: React.FC<UploadImageProps> = ({
  onNext,
  post,
  handleImageChange,
}) => {
  return (
    <div className="image-selection-box">
      {!post.imageUrl && <div className="step-one"><h4>1st add picture</h4></div>}
      <Button
        variant="contained"
        component="label"
        startIcon={<AddAPhotoIcon />}
      >
        {post.imageUrl ? "ChangeImage" : "Upload Image"}
        <input
          type="file"
          hidden
          onChange={handleImageChange}
          accept="image/*"
        />
      </Button>
      {post.imageUrl && (
        <>
          <button className="create-post-btn" onClick={onNext}><h4>Next</h4></button>

          <div className="image-box">
            <img src={post.imageUrl} alt="Post" className="post-image" />
          </div>
        </>
      )}
    </div>
  );
};
