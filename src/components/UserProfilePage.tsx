import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { auth } from "../utils/firebase";
import { User } from "firebase/auth";
import { Button, TextField, Container, Typography } from "@mui/material";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null; // This is optional and can be null based on the data you shared
  // Add any other fields you want the user to be able to update
};


export const UserProfilePage = () => {
  const { register, handleSubmit, setValue, formState } = useForm();
  // const {  setValue, formState } = useForm();
  const { errors } = formState;
  const [user, setUser] = useState<null | User>(null);

  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    console.log(auth.currentUser, ': auth.currentUser')
    if (auth.currentUser) {
      setUser(auth.currentUser);
      console.log(user, ':user')
      // setValue("firstName", auth.currentUser.firstName);  I cannot set firstName or lastName because they dont exist on 'user'  
      // setValue("lastName", auth.currentUser.lastName);
      setValue("email", auth.currentUser.email);
    }
  }, [setValue]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((loggedInUser) => {
        if (loggedInUser) {
            setUser(loggedInUser);
            setValue("email", loggedInUser.email);
        }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
}, [setValue]);


  const onSubmit = (data: FormData)  => { 
    // Here, add functionality to update user data in Firebase.
    // For now, let's just display a success message.
    setUpdateMessage("Profile updated successfully!");
    console.log(data);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="sm">
      <Typography variant="h5" gutterBottom>
        Edit Profile
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}> {/*Argument of type '(data: FormData) => void' is not assignable to parameter of type
       'SubmitHandler<FieldValues>'.Types of parameters 'data' and 'data' are incompatible.Type 'FieldValues' is missing the following
        properties from type 'FormData': firstName, lastName, emailts(2345)*/}
        <TextField
          fullWidth
          margin="normal"
          label="First Name"
          {...register('firstName', { required: true })}

          error={Boolean(errors.firstName)}
          helperText={errors.firstName && "First name is required"}
        />

        <TextField
          fullWidth
          margin="normal"
          label="Last Name"
          {...register('lastName', { required: true })}
          error={Boolean(errors.lastName)}
          helperText={errors.lastName && "Last name is required"}
        />

        <TextField
          fullWidth
          margin="normal"
          label="Email"
          {...register('email', { required: true })}
          error={Boolean(errors.email)}
          helperText={errors.email && "Email is required"}
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



