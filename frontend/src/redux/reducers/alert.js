import { SET_ALERT, REMOVE_ALERT } from "../actions/types";

const initialState = {
  alert: null,
};

export default function alert(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case SET_ALERT:
      return { alert: payload }; // ✅ ahora tendrá una propiedad 'alert'
    case REMOVE_ALERT:
      return { alert: null };
    default:
      return state;
  }
}
