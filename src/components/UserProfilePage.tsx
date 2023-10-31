import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button, TextField, Container, Typography } from "@mui/material";
// import { fetchUserFromFirebase } from "../utils/userData/fetchUserFromFirebase";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { doc, setDoc } from "firebase/firestore"; // needed for saving updates
import { db } from "../utils/firebase";
import { useNavigate } from "react-router-dom";

type FormData = {
  firstName: string;
  lastName: string;
};

interface UserProfileFormProps {
  onSubmit: SubmitHandler<FormData>;
  form: ReturnType<typeof useForm<FormData>>;
  currentUserFirstName?: string;
  currentUserLastName?: string;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({
  onSubmit,
  form,
  currentUserFirstName,
  currentUserLastName,
}) => {
  const { register, handleSubmit, setValue, formState } = form;
  const { errors } = formState;

  // Set default values on mount
  useEffect(() => {
    if (currentUserFirstName) setValue("firstName", currentUserFirstName);
    if (currentUserLastName) setValue("lastName", currentUserLastName);
  }, [currentUserFirstName, currentUserLastName, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}> {/*rgument of type 'SubmitHandler<FormData>' is not assignable to parameter of type 'SubmitHandler<FieldValues>'.
  Type 'FieldValues' is missing the following properties from type 'FormData': firstName, lastNamets(2345)*/}
      <TextField
        fullWidth
        margin="normal"
        label="First Name"
        {...register("firstName", { required: "First name is required" })}
        error={Boolean(errors.firstName)}
        helperText={errors.firstName && "First name is required"}
      />
      <TextField
        fullWidth
        margin="normal"
        label="Last Name"
        {...register("lastName", { required: "Last name is required" })}
        error={Boolean(errors.lastName)}
        helperText={errors.lastName && "Last name is required"}
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={formState.isSubmitting}
        style={{ marginTop: "16px" }}
      >
        Update Profile
      </Button>
    </form>
  );
};

export const UserProfilePage = () => {
  // const dispatch = useDispatch();

  const userData = useSelector(selectUser);
  const form = useForm<FormData>();
  const [updateMessage, setUpdateMessage] = useState("");

  const navigate = useNavigate();

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (userData?.uid) {
      const userDocRef = doc(db, "users", userData.uid);
      await setDoc(
        userDocRef,
        {
          firstName: data.firstName,
          lastName: data.lastName,
        },
        { merge: true }
      )
        .then(() => {
          // Consider updating Redux state here if necessary
          setUpdateMessage("Profile updated successfully!");
        })
        .catch((error) => {
          console.error("Error updating user profile:", error);
        });
    }
  };

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="sm">
      <Button
        variant="contained"
        color="secondary"
        onClick={() => navigate('/userHomePage')}
        style={{ marginTop: "16px", marginLeft: "8px" }}
      >
        Close
      </Button>

      <Typography variant="h5" gutterBottom>
        Edit Profile
      </Typography>
      <UserProfileForm
        onSubmit={onSubmit}
        form={form} 
        currentUserFirstName={userData.firstName}
        currentUserLastName={userData.lastName}
      />

      {updateMessage && (
        <Typography color="primary" style={{ marginTop: "16px" }}>
          {updateMessage}
        </Typography>
      )}
    </Container>
  );
};
