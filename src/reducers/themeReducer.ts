// themeReducer.ts
import { TOGGLE_THEME } from '../actions/themeActions';

const initialState = {
  isDarkMode: false,
};

export const themeReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case TOGGLE_THEME:
      return {
        ...state,
        isDarkMode: !state.isDarkMode,
      };
    default:
      return state;
  }
};
