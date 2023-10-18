import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button, TextField, Container, Typography } from "@mui/material";
import { fetchUserData } from "../utils/userData/fetchUserFromFirebase";
import { useDispatch, useSelector } from "react-redux";
import { selectUser, setUser } from "../Slices/userSlice";
import { doc, setDoc } from "firebase/firestore"; // needed for saving updates
import { db } from "../utils/firebase";

type FormData = {
  firstName: string;
  lastName: string;
};

const UserProfileForm: React.FC<{ onSubmit: SubmitHandler<FormData>, form: ReturnType<typeof useForm> }> = ({ onSubmit, form }) => {
  const { register, handleSubmit, formState } = form;
  const { errors } = formState;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          fullWidth
          margin="normal"
          label="First Name"
          {...register('firstName', { required: "First name is required" })}
          error={Boolean(errors.firstName)}
          helperText={errors.firstName && "First name is required"}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Last Name"
          {...register('lastName', { required: "Last name is required" })}
          error={Boolean(errors.lastName)}
          helperText={errors.lastName && "Last name is required"}
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
  );
};

export const UserProfilePage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  console.log(user)
  const { setValue } = useForm<FormData>();
  const [updateMessage, setUpdateMessage] = useState("");
  const form = useForm<FormData>();

   // Check if user data is not available in Redux, then fetch and store
   useEffect(() => {
    if (!user) {
      const fetchAndSetUser = async () => {
        const loggedInUser = auth.currentUser; // you need to import and configure auth 
        if (loggedInUser) {
          const fetchedUserData = await fetchUserData(loggedInUser.uid);
          dispatch(setUser(fetchedUserData));
        }
        console.log(fetchUserData)
      };
      fetchAndSetUser();
    }
  }, [user, dispatch]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (user) {
      // Updating Firestore directly with the updated user data
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, {
        firstName: data.firstName,
        lastName: data.lastName
      }, { merge: true })
      .then(() => {
        setUpdateMessage("Profile updated successfully!");
      })
      .catch((error) => {
        console.error("Error updating user profile:", error);
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
      {user && <UserProfileForm onSubmit={onSubmit} form={form} />}
      {updateMessage && <Typography color="primary" style={{ marginTop: '16px' }}>{updateMessage}</Typography>}
    </Container>
  );
};