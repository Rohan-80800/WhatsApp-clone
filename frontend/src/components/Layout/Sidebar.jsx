import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { toggleTheme } from "../../store/slices/themeSlice";
import { setActiveChat } from "../../store/slices/chatSlice";
import { Tooltip } from "../ui/tooltip";
import { generateAvatar } from "../../utils/avatarUtils";
import { useIsMobile } from "../../utils/useIsMobile";

const Sidebar = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isDark } = useSelector((state) => state.theme);
   const { activeChat } = useSelector((state) => state.chat);
   const isMobile = useIsMobile();
  const { initials, color } = generateAvatar(
    user?.username || "",
    user?.avatarColor
  );

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const handleBackToChatList = () => {
    dispatch(setActiveChat(null));
  };

  return (
    <div className="w-16 bg-wa-bg-secondary border-r border-wa-border flex flex-col items-center py-4">
      <div className="mb-6">
        <Tooltip content={user?.username || user?.phone || "User Profile"}>
          <div className="relative">
            {user?.profilePicture ? (
              <img
                src={`http://localhost:5000${user.profilePicture}`}
                alt={user?.username || user?.phone || "User"}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-medium"
              style={{
                backgroundColor: color,
                display: user?.profilePicture ? "none" : "flex"
              }}
            >
              {initials}
            </div>
          </div>
        </Tooltip>
      </div>

      <div className="flex flex-col space-y-4 flex-1">
        {isMobile && activeChat && (
          <Tooltip content="Back to Chats">
            <button
              onClick={handleBackToChatList}
              className="p-3 rounded-lg text-wa-text-muted dark:text-wa-text-muted-dark hover:bg-wa-hover dark:hover:bg-wa-hover hover:text-wa-text dark:hover:text-wa-text-light transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
              </svg>
            </button>
          </Tooltip>
        )}
      </div>

      <div className="flex flex-col space-y-2">
        <Tooltip
          content={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <button
            title={isDark ? "Light Mode" : "Dark Mode"}
            onClick={handleToggleTheme}
            className="p-3 rounded-lg text-wa-text-muted hover:bg-wa-hover hover:text-wa-text transition-colors"
          >
            {isDark ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default Sidebar;
