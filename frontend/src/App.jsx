import { useState, useEffect } from "react";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import { restoreAuth, logout } from "./store/slices/authSlice";
import axios from "axios";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "./components/ui/tooltip";
import { store } from "./store/store";
import NotFound from "./pages/NotFound";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import WhatsAppMain from "./components/WhatsAppMain";

const queryClient = new QueryClient();

const AuthWrapper = () => {
  const { isAuthenticated, isLoading, token } = useSelector(
    (state) => state.auth
  );
  const [isLogin, setIsLogin] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const validateToken = async () => {
      try {
        if (token) {
          await axios.get("http://localhost:5000/api/auth/verify", {
            headers: { Authorization: `Bearer ${token}` }
          });
          dispatch(restoreAuth());
        } else {
          dispatch(logout());
        }
      } catch (error) {
        console.error("Token validation failed:", error);
        dispatch(logout());
      }
    };

    validateToken();
  }, [dispatch, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-wa-bg flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <WhatsAppMain />;
  }

  return isLogin ? (
    <Login onToggleAuth={() => setIsLogin(false)} />
  ) : (
    <Signup onToggleAuth={() => setIsLogin(true)} />
  );
};

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#333",
                color: "#fff"
              }
            }}
          />
          <Routes>
            <Route path="/" element={<AuthWrapper />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
