import { createSlice } from "@reduxjs/toolkit";

const loadAuthState = () => {
  try {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      return {
        isAuthenticated: true,
        user: JSON.parse(user),
        token,
        isLoading: false
      };
    }
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false
    };
  } catch (error) {
    console.error("Error loading auth state:", error);
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false
    };
  }
};

const initialState = loadAuthState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoading = false;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
    },
    registerSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoading = false;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.isLoading = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    restoreAuth: (state) => {
      const loadedState = loadAuthState();
      state.isAuthenticated = loadedState.isAuthenticated;
      state.user = loadedState.user;
      state.token = loadedState.token;
      state.isLoading = false;
    }
  }
});

export const { loginSuccess, registerSuccess, logout, restoreAuth } =
  authSlice.actions;
export default authSlice.reducer;
