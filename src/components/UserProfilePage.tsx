import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { auth, updateProfile } from "../utils/firebase"; 
import { User } from "firebase/auth";
import { Button, TextField, Container, Typography } from "@mui/material";

type FormData = {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  displayName: string;
};

export const UserProfilePage = () => {
  const { register, handleSubmit, setValue, formState } = useForm<FormData>();
  const { errors } = formState;
  const [user, setUser] = useState<null | User>(null);
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((loggedInUser) => {
      console.log(loggedInUser, 'loggedInUser')
        if (loggedInUser) {
            setUser(loggedInUser);
            setValue("displayName", loggedInUser.displayName || "");
            setValue("email", loggedInUser.email || ""); // Setting initial value for email
            // You might need to fetch 'firstName', 'lastName', and 'company' if stored elsewhere
        }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setValue]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (user) {
      await updateProfile(user, {
        displayName: data.displayName,
        // Update the email address using Firebase SDK
        email: data.email
        // You might need to save 'firstName', 'lastName', and 'company' in your database or other storage
      }).then(() => {
        setUpdateMessage("Profile updated successfully!");
      }).catch((error) => {
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
          label="First Name"
          {...register('firstName')}
          error={Boolean(errors.firstName)}
          helperText={errors.firstName && "First name is required"}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Last Name"
          {...register('lastName')}
          error={Boolean(errors.lastName)}
          helperText={errors.lastName && "Last name is required"}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Email"
          {...register('email')}
          error={Boolean(errors.email)}
          helperText={errors.email && "Last name is required"}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Company"
          {...register('company')}
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