import api from 'utils/axiosConfig'
import {
  CREATE_USER_SUCCESS,
  CREATE_USER_FAIL,
  SET_LOADING,
  GET_USER_DETAILS_SUCCESS,
  GET_USER_DETAILS_FAIL,
  GET_MY_USER_DETAILS_SUCCESS,
  GET_MY_USER_DETAILS_FAIL
} from './types';

// 🔐 Obtener perfil del usuario logueado (con JWT)
export const get_my_user_details = () => async (dispatch) => {
  try {
    const token = localStorage.getItem("token");

    const config = {
      headers: {
        Authorization: `JWT ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    const res = await api.get(
      `${process.env.REACT_APP_API_URL}/auth/users/me/`,
      config
    );

    dispatch({
      type: GET_MY_USER_DETAILS_SUCCESS,
      payload: res.data,
    });
  } catch (err) {
    dispatch({
      type: GET_MY_USER_DETAILS_FAIL,
    });
  }
};

// (Opcional) Obtener detalles de otro usuario por ID o account
export const get_user_details = (userId) => async (dispatch) => {
  try {
    const res = await api.get(
    `${process.env.REACT_APP_API_URL}/api/user/profile/${userId}/`
    );

    dispatch({
      type: GET_USER_DETAILS_SUCCESS,
      payload: res.data,
    });
  } catch (err) {
    dispatch({
      type: GET_USER_DETAILS_FAIL,
    });
  }
};


export const create_user = (userData) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const payload = {
      ...userData,
      username: userData.username || userData.email,
    };

    const res = await api.post(
      `${process.env.REACT_APP_API_URL}/api/user/create/`,
      JSON.stringify(payload),
      config
    );

    if (res.status === 201) {
      dispatch({
        type: CREATE_USER_SUCCESS,
        payload: res.data,
      });
    } else {
      dispatch({ type: CREATE_USER_FAIL });
    }
  } catch (err) {
    console.error("❌ Error creando usuario:", err.response?.data || err.message);
    dispatch({ type: CREATE_USER_FAIL });
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
};