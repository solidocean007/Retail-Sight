import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../utils/store";
import { showMessage } from "../Slices/snackbarSlice";

const useProtectedAction = () => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const performAction = (action: () => void) => {
    if (!currentUser) {
      dispatch(showMessage("Sign-up or login to continue"));
      navigate("/sign-up-login");
    } else {
      action();
    }
  };

  return performAction;
};

export default useProtectedAction;
