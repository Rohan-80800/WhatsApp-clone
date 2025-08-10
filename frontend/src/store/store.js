import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./slices/authSlice";
import chatSlice from "./slices/chatSlice";
import themeSlice from "./slices/themeSlice";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    theme: themeSlice
  }
});
