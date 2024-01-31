import { deleteDoc, doc, updateDoc } from "firebase/firestore";
// import { auth, db } from "../utils/firebase";
import { db } from "../utils/firebase";
// import { UserType } from "../utils/types";
// import { deleteUser } from "@firebase/auth";

export const deleteCompany = async (companyId: string) => {
  try {
    await deleteDoc(doc(db, "companies", companyId));
    console.log("Company deleted successfully");
    // Additional logic (e.g., update state or UI)
  } catch (error) {
    console.error("Error deleting company:", error);
  }
};

// export const updateCompany = async (companyId, updatedCompanyData) => {
//   try {
//     await updateDoc(doc(db, "companies", companyId), updatedCompanyData);
//     console.log("Company updated successfully");
//     // Additional logic (e.g., update state or UI)
//   } catch (error) {
//     console.error("Error updating company:", error);
//   }
// };

const deleteFirestoreUser = async (userId: string) => {
  try {
    await deleteDoc(doc(db, "users", userId));
    console.log("User deleted successfully");
    // Additional logic (e.g., update state or UI)
  } catch (error) {
    console.error("Error deleting user:", error);
  }
};

// this function may not belong here on the client side code.  i may have to wait to add this to functions once i get it setup
// const deleteSelectedUserAuth = async (userId: string) => { // this function is responsible for deleting a user document from firebase auth
//   try {
//     await deleteUser(userId); // Argument of type 'string' is not assignable to parameter of type 'User'.  it needs a user object
//     console.log("User auth record deleted successfully");
//   } catch (error) {
//     console.error("Error deleting user auth record:", error);
//   }
// };

// Function to delete both auth and Firestore data
export const deleteUserAuthAndFirestore = async (userId:string) => {
  // await deleteSelectedUserAuth(userId);
  await deleteFirestoreUser(userId);
};

export const updateSelectedUser = async (userId:string, updatedUserData : { [key: string]: any }) => { // Unexpected any. Specify a different type. should this be a usertype?
  try {
    await updateDoc(doc(db, "users", userId), updatedUserData);
    console.log("User updated successfully");
    // Additional logic (e.g., update state or UI)
  } catch (error) {
    console.error("Error updating user:", error);
  }
};
