// onUserNameClick.ts
import { PostType } from "../types";
import { AppDispatch } from "../store";
import { openUserModal } from "../../Slices/userModalSlice";

export const onUserNameClick = (post: PostType, dispatch: AppDispatch) => {
  dispatch(openUserModal(post.user));
};
