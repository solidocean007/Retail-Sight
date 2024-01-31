// onUserNameClick.ts
import { PostType } from "../types";
import { AppDispatch } from "../store";
import { openUserModal } from "../../Slices/userModalSlice";

export const onUserNameClick = (post: PostType, dispatch: AppDispatch) => {
  // Ensure that the post object contains the necessary user fields
  if (post.postUserName && post.postUserEmail) {
    const userData = {
      userName: post.postUserName,
      userEmail: post.postUserEmail,
    };
    dispatch(openUserModal(userData));
  }
};
