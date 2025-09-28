import {
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOAD_USER_SUCCESS,
  LOAD_USER_FAIL,
  AUTHENTICATED_SUCCESS,
  AUTHENTICATED_FAIL,
  LOGOUT
} from '../actions/types';

const initialState = {
  access: localStorage.getItem('access'),
  user: null,
  isAuthenticated: null,
  loading: true,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case LOGIN_SUCCESS:
      localStorage.setItem('access', action.payload.access);
      return {
        ...state,
        isAuthenticated: true,
        access: action.payload.access,
        loading: false,
      };

    case LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };

    case LOAD_USER_FAIL:
    case LOGIN_FAIL:
    case AUTHENTICATED_FAIL:
    case LOGOUT:
      localStorage.removeItem('access');
      return {
        ...state,
        access: null,
        isAuthenticated: false,
        user: null,
        loading: false, // ✅ esencial para que la UI no se quede "cargando"
      };

    default:
      return state;
  }
}