import { useState } from "react";
import { CreatePost } from "./CreatePost";
import Button from '@mui/material/Button';
import LogOutButton from "./LogOutButton";

export const UserHomePage = () => {
  const [open, setOpen] = useState(false);
  console.log('Rendering UserHomePage');

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <LogOutButton />
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Create Post
      </Button>
      {open && <CreatePost closeCreatePost={handleClose}/>}
    </div>
  );
}
