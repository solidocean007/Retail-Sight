import { Button } from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import { PostType } from "../../utils/types";
import './uploadimage.css'
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import heic2any from "heic2any";


interface UploadImageProps {
  post: PostType;
  setPost: React.Dispatch<React.SetStateAction<PostType>>;
  onNext: () => void;
}

export const UploadImage: React.FC<UploadImageProps> = ({
  post,
  setPost,
  onNext,
}) => {
    const dispatch = useAppDispatch();

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
  
      if (!file) {
        dispatch(showMessage("No file selected. Please choose an image."));
        return;
      }
  
      const validImageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/heif",
      ];
  
      if (validImageTypes.includes(file.type)) {
        if (file.type === "image/heic" || file.type === "image/heif") {
          try {
            const convertedBlob = await heic2any({
              blob: file,
              toType: "image/jpeg",
            });
  
            // Handle the case where `heic2any` returns an array
            const singleBlob = Array.isArray(convertedBlob)
              ? convertedBlob[0]
              : convertedBlob;
  
            const convertedFile = new File(
              [singleBlob],
              file.name.replace(/\.\w+$/, ".jpg"),
              { type: "image/jpeg" }
            );
            const reader = new FileReader();
            reader.onloadend = () => {
              setPost({ ...post, imageUrl: reader.result as string });
              dispatch(showMessage("Image converted and selected successfully!"));
            };
            reader.readAsDataURL(convertedFile);
          } catch (error) {
            console.error("Error converting HEIC/HEIF image:", error);
            dispatch(
              showMessage("Failed to convert HEIC/HEIF image. Please try again.")
            );
          }
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPost({ ...post, imageUrl: reader.result as string });
            dispatch(showMessage("Image selected successfully!"));
          };
          reader.readAsDataURL(file);
        }
      } else {
        dispatch(
          showMessage("Unsupported file type. Please upload a valid image.")
        );
      }
    };
    
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
