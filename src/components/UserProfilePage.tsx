import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { auth, updateProfile } from "../utils/firebase"; 
import { User } from "firebase/auth";
import { Button, TextField, Container, Typography } from "@mui/material";

type FormData = {
  displayName: string; // Changed to display name
};

export const UserProfilePage = () => {
  const { register, handleSubmit, setValue, formState } = useForm<FormData>();
  const { errors } = formState;
  const [user, setUser] = useState<null | User>(null);
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((loggedInUser) => {
        if (loggedInUser) {
            setUser(loggedInUser);
            setValue("displayName", loggedInUser.displayName || "");
        }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setValue]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (user) {
      await updateProfile(user, {
        displayName: data.displayName
      }).then(() => {
        // Update successful
        setUpdateMessage("Display name updated successfully!");
      }).catch((error) => {
        // An error occurred
        // Handle errors here
      });
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="sm">
      <Typography variant="h5" gutterBottom>
        Edit Profile
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          fullWidth
          margin="normal"
          label="Display Name"
          {...register('displayName', { required: true })}
          error={Boolean(errors.displayName)}
          helperText={errors.displayName && "Display name is required"}
        />
        <Button 
          type="submit"
          variant="contained" 
          color="primary"
          disabled={formState.isSubmitting}
          style={{ marginTop: '16px' }}
        >
          Update Profile
        </Button>
      </form>
      {updateMessage && <Typography color="primary" style={{ marginTop: '16px' }}>{updateMessage}</Typography>}
    </Container>
  );
};