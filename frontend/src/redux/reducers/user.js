import {
  LOAD_USER_SUCCESS,
  LOAD_USER_FAIL,
  GET_USER_DETAILS_SUCCESS,
  GET_USER_DETAILS_FAIL,
  GET_MY_USER_DETAILS_SUCCESS,
  GET_MY_USER_DETAILS_FAIL,
} from "../actions/types";

const initialState = {
  user: null,
  my_user: null,
};

export default function user(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case LOAD_USER_SUCCESS:
    case GET_MY_USER_DETAILS_SUCCESS:
      return {
        ...state,
        my_user: payload, // ✅ Carga el usuario completo
      };
    case LOAD_USER_FAIL:
    case GET_MY_USER_DETAILS_FAIL:
      return {
        ...state,
        my_user: null,
      };
    case GET_USER_DETAILS_SUCCESS:
      return {
        ...state,
        user: payload,
      };
    case GET_USER_DETAILS_FAIL:
      return {
        ...state,
        user: null,
      };
    default:
      return state;
  }
}