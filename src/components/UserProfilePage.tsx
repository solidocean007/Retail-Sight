// Import necessary functionalities
import React, { useEffect, useState } from "react";  // useEffect and useState are hooks provided by React
import { useForm } from "react-hook-form";  // useForm is a hook provided by react-hook-form for managing form state
import { auth } from "../firebase";  // auth is the Firebase auth service which lets you interact with Firebase Authentication

// Define the UserProfilePage component
const UserProfilePage = () => {
  
  // Initialize the useForm hook and extract the necessary methods
  const { register, handleSubmit, errors, setValue } = useForm();

  // Initialize state for the user
  const [user, setUser] = useState(null);  // 'user' will store the current user's data, initially it's null

  // useEffect hook will run when the component is mounted and whenever 'setValue' function changes
  useEffect(() => {
    // Check if a user is logged in
    if (auth.currentUser) {
      // If a user is logged in, save the user's data in the 'user' state
      setUser(auth.currentUser);

      // Pre-fill the 'email' field in the form with the user's email
      setValue("email", auth.currentUser.email); 
    }
  }, [setValue]);  // This effect depends on the 'setValue' function

  // Function to be called when the form is submitted
  const onSubmit = data => {
    console.log(data);  // For now, just log the form data to the console
  };

  // If the 'user' state is still null (no user data yet), show a loading message
  if (!user) {
    return <div>Loading...</div>; // Or you can use a loading spinner here
  }

  // Render the form
  return (
    // When the form is submitted, the 'onSubmit' function is called
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Input for first name */}
      {/* The 'register' function from useForm is used to register this input to the form */}
      {/* The 'required' option means that this field is required */}
      <input name="firstName" ref={register({ required: true })} placeholder="First name" />
      
      {/* If there was an error with the first name field (it was not filled out), show an error message */}
      {errors.firstName && "First name is required"}

      {/* The same is done for the last name and email fields */}
      <input name="lastName" ref={register({ required: true })} placeholder="Last name" />
      {errors.lastName && "Last name is required"}

      <input name="email" ref={register({ required: true })} placeholder="Email" />
      {errors.email && "Email is required"}

      {/* Submit button for the form */}
      <button type="submit">Submit</button>
    </form>
  );
};

// Export the UserProfilePage component so it can be used in other files
export default UserProfilePage;

