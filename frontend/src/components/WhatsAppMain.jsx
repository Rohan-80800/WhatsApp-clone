import { useSelector, useDispatch } from "react-redux";
import { logout } from "../store/slices/authSlice";
import { setActiveChat } from "../store/slices/chatSlice";
import Sidebar from "./Layout/Sidebar";
import ChatList from "./Chat/ChatList";
import ChatArea from "./Chat/ChatArea";
import { useIsMobile } from "../utils/useIsMobile";
import { useEffect } from "react";

const WhatsAppMain = () => {
  const { isDark } = useSelector((state) => state.theme);
  const { activeChat } = useSelector((state) => state.chat);
  const isMobile = useIsMobile();
  const dispatch = useDispatch();

  useEffect(() => {
    if (isMobile) {
      dispatch(setActiveChat(null)); 
    }
  }, [isMobile, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleBackToChatList = () => {
    dispatch(setActiveChat(null));
  };

  return (
    <div className={`h-screen flex ${isDark ? "dark" : ""}`}>
      {isMobile && activeChat ? <Sidebar /> : null}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-wa-header p-4 flex justify-between items-center">
          <h1 className="text-wa-text font-semibold">WhatsApp</h1>
          <button
            onClick={handleLogout}
            className="bg-wa-green text-white px-4 py-2 rounded-lg hover:bg-wa-green-dark transition-colors"
          >
            Logout
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {isMobile ? (
            activeChat ? (
              <div className="flex-1 flex flex-col">
                <button
                  onClick={handleBackToChatList}
                  className="p-2 text-wa-text-muted hover:text-wa-text self-start"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
                  </svg>
                </button>
                <ChatArea />
              </div>
            ) : (
              <ChatList />
            )
          ) : (
            <>
              <Sidebar />
              <ChatList />
              <ChatArea />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppMain;
