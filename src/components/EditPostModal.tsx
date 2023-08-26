import React from "react";
import Modal from "@mui/material/Modal";
import { PostType } from "../utils/types";
import { Button } from "@mui/material";

interface EditPostModalProps {
  post: PostType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPost: PostType) => void;
  onDelete: (postId: string) => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const handleSave = () => {
    // Logic to save changes to post
    // For now, it's just a stub to illustrate the concept
    onSave(post);
  };

  const handleDelete = () => {
    onDelete(post.id);
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div style={{ padding: '20px', backgroundColor: 'white' }}>  {/* Added this wrapper div */}
        {/* Your input fields for editing post details */}
        <Button onClick={handleSave}>Save Changes</Button>
        <Button onClick={handleDelete}>Delete Post</Button>
      </div>
    </Modal>
  );
};

export default EditPostModal;
