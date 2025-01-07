import { collection, addDoc } from "@firebase/firestore";
import { db } from "../firebase";
import { CompanyGoalType } from "../types";

export const createCompanyGoal = async (
  newGoal: Omit<CompanyGoalType, "id">
): Promise<CompanyGoalType> => {
  if (!newGoal.goalDescription || !newGoal.goalMetric || !newGoal.goalValueMin) {
    throw new Error("Missing required fields for creating a goal.");
  }

  try {
    const companyGoalCollectionRef = collection(db, "companyGoals"); // Reference to the "companyGoals" collection
    const docRef = await addDoc(companyGoalCollectionRef, newGoal); // Add the goal to Firestore

    console.log("Company goal created successfully:", {
      ...newGoal,
      id: docRef.id,
    });

    return { ...newGoal, id: docRef.id }; // Return the goal with its Firestore-generated ID
  } catch (error) {
    console.error("Error creating company goal:", error);
    throw error; // Propagate the error for the caller to handle
  }
};



