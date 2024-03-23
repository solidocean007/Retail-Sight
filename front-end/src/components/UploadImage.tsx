import { Button } from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import { PostWithID } from "../utils/types";

interface UploadImageProps {
  onNext: () => void;
  post: PostWithID;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadImage: React.FC<UploadImageProps> = ({
  onNext,
  post,
  handleImageChange,
}) => {
  return (
    <div className="image-selection-box">
      <div className="step-one">1st add picture</div>
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
          <div className="image-box">
            <img src={post.imageUrl} alt="Post" className="post-image" />
          </div>
          <Button onClick={onNext}><h4>Next step</h4></Button>
        </>
      )}
    </div>
  );
};
