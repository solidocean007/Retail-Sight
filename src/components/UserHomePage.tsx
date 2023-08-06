import { useState } from "react";

import Button from '@mui/material/Button';

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
      STuff
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Create Post
      </Button>
      {open && <CreatePost closeCreatePost={handleClose}/>}
    </div>
  );
}
