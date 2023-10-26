import { Dispatch } from 'redux';
import { openUserModal } from '../Slices/userModalSlice';

export const handleUserNameClick = (uid: string, dispatch: Dispatch) => {
  console.log(uid);
  console.log(dispatch);

  dispatch(openUserModal(uid));
};

