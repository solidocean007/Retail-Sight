// PostCard.tsx
import React from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import { PostType } from "../utils/types"; // Assuming you have types defined somewhere
import { PostDescription } from "./PostDescription";

interface PostCardProps {
  post: PostType;
  getPostsByTag: (hashTag: string)=> void;
}

const PostCard: React.FC<PostCardProps> = ({ post, getPostsByTag }) => {
  const [comment, setComment] = useState("");
  let formattedDate = "N/A"; // default value
  if (post.timestamp && post.timestamp.toDate) {
    const jsDate = post.timestamp.toDate();
    formattedDate = jsDate.toLocaleDateString();
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const submitComment = () => {
    // Logic to submit comment here
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">
          {post.user.name} ({post.user.company})
        </Typography>
        {/* <Typography color="textSecondary">{new Date(post.createdAt).toLocaleDateString()}</Typography> */}
        <Typography color="textSecondary">{formattedDate}</Typography>
        {/* Display the post's image */}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post"
            style={{ width: "100%", maxHeight: "400px", objectFit: "cover" }}
          />
        )}
        {/* <Typography variant="body2">{post.description}</Typography>{" "} */}
        <PostDescription description={post.description} getPostsByTag={getPostsByTag} />
        {/* Display the post's description */}
        <TextField
          label="Comment"
          value={comment}
          onChange={handleCommentChange}
          fullWidth
        />
        <Button onClick={submitComment}>Post Comment</Button>
      </CardContent>
    </Card>
  );
};

export default PostCard;
