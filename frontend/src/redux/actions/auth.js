import api  from 'utils/axiosConfig'
import {
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOAD_USER_SUCCESS,
  LOAD_USER_FAIL
} from './types';
import { setAlert } from './alert';
export const LOGOUT = "LOGOUT";


export const login = (email, password) => async dispatch => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const body = JSON.stringify({ email, password });

  try {
    const res = await api.post(`${process.env.REACT_APP_API_URL}/auth/jwt/create/`, body, config);

    localStorage.setItem('access', res.data.access);
    localStorage.setItem('refresh', res.data.refresh);

    dispatch({
      type: LOGIN_SUCCESS,
      payload: res.data,
    });

    dispatch(load_user()); // ✅ cargar usuario
  } catch (err) {
    dispatch(setAlert("Credenciales incorrectas. Intenta nuevamente.", "red")); // ✅ Alerta visible
    dispatch({
      type: LOGIN_FAIL,
    });
  }
};

export const load_user = () => async dispatch => {
  if (localStorage.getItem('access')) {
    try {
      const res = await api.get(`${process.env.REACT_APP_API_URL}/auth/users/me/`, {
        headers: {
          Authorization: `JWT ${localStorage.getItem('access')}`,
        },
      });

      dispatch({
        type: LOAD_USER_SUCCESS,
        payload: res.data,
      });
    } catch (err) {
      dispatch({
        type: LOAD_USER_FAIL,
      });
    }
  } else {
    dispatch({
      type: LOAD_USER_FAIL,
    });
  }
};

export const logout = () => dispatch => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');

  dispatch({ type: LOGOUT });
};