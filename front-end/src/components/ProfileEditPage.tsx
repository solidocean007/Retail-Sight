import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button, CircularProgress, TextField, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { doc, setDoc } from "firebase/firestore"; // needed for saving updates
import { db } from "../utils/firebase";
// import { useNavigate } from "react-router-dom";
import "./profileEditPage.css";
import { getAuth, updateProfile } from "@firebase/auth";

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
    <form onSubmit={handleSubmit(onSubmit)}>
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

export const ProfileEditPage = ({
  setOpenEdit,
}: {
  setOpenEdit: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const userData = useSelector(selectUser);
  const form = useForm<FormData>();
  const [updateMessage, setUpdateMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (userData?.uid) {
      const userDocRef = doc(db, "users", userData.uid);
      const auth = getAuth();
      const fullName = `${data.firstName} ${data.lastName}`;

      try {
        await setDoc(
          userDocRef,
          { firstName: data.firstName, lastName: data.lastName },
          { merge: true },
        );
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: fullName });
        }
        setUpdateMessage("Profile updated successfully!");
        setErrorMessage(""); // Reset any previous error messages
      } catch (error) {
        console.error("Error updating user profile:", error);
        setUpdateMessage(""); // Clear success message if any
        setErrorMessage("Failed to update profile. Please try again.");
      }
    }
  };

  // Consider also resetting form and messages when closing
  const handleClose = () => {
    setOpenEdit(false);
    setUpdateMessage("");
    setErrorMessage("");
    form.reset();
  };

  if (!userData) {
    return <CircularProgress />;
  }

  return (
    <div className="user-modal-overlay">
      <div className="profile-edit-page">
        <Button
          variant="contained"
          color="secondary"
          onClick={handleClose}
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
        {errorMessage && (
          <Typography color="error" style={{ marginTop: "16px" }}>
            {errorMessage}
          </Typography>
        )}
      </div>
    </div>
  );
};
