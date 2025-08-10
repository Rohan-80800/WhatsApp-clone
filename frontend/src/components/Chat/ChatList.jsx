import { useSelector, useDispatch } from "react-redux";
import {
  setActiveChat,
  setSearchQuery,
  fetchContacts,
  fetchMessages
} from "../../store/slices/chatSlice";
import { format, isToday, isYesterday } from "date-fns";
import { useIsMobile } from "../../utils/useIsMobile";
import { useEffect } from "react";
import { generateAvatar } from "../../utils/avatarUtils";

const ChatList = () => {
  const dispatch = useDispatch();
  const { contacts, activeChat, searchQuery, status, messages } = useSelector(
    (state) => state.chat
  );
  const authUser = useSelector((state) => state.auth.user);
  const isMobile = useIsMobile();

  useEffect(() => {
    dispatch(fetchContacts());
    dispatch(fetchMessages());
  }, [dispatch]);

  const getLastMessage = (contactId) => {
    const chatId = [contactId, authUser.id].sort().join("_");
    const chatMessages = messages[chatId] || [];
    return chatMessages.length > 0
      ? chatMessages[chatMessages.length - 1]
      : null;
  };

  const filteredContacts = contacts
    .map((contact) => {
      const lastMessage = getLastMessage(contact.id);
      return {
        ...contact,
        lastMessage: lastMessage
          ? lastMessage.senderId === authUser.id
            ? `You: ${lastMessage.content}`
            : lastMessage.content
          : "No messages yet",
        lastMessageTime: lastMessage ? lastMessage.timestamp : null,
        lastMessageStatus: lastMessage ? lastMessage.status : null,
        unreadCount: (
          messages[[contact.id, authUser.id].sort().join("_")] || []
        ).filter((msg) => msg.senderId !== authUser.id && msg.status !== "read")
          .length
      };
    })
    .filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery)
    )
    .sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "dd/MM/yyyy");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return <div className="w-4 h-4 text-wa-text-muted">✓</div>;
      case "delivered":
        return <div className="w-4 h-4 text-wa-text-muted">✓✓</div>;
      case "read":
        return <div className="w-4 h-4 text-blue-500">✓✓</div>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full md:w-80 bg-wa-bg-panel border-r border-wa-border flex flex-col h-full">
      <div className="p-4 bg-wa-bg-panel border-b border-wa-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-wa-text">Chats</h1>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full hover:bg-wa-hover transition-colors">
              <svg
                className="w-5 h-5 text-wa-text-muted"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-wa-hover transition-colors">
              <svg
                className="w-5 h-5 text-wa-text-muted"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            className="w-full pl-10 pr-4 py-2 bg-wa-bg-secondary border border-wa-border rounded-lg focus:outline-none focus:ring-2 focus:ring-wa-green text-wa-text placeholder-wa-text-muted text-sm"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-wa-text-muted"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {status === "loading" ? (
          <div className="p-4 text-center text-wa-text-muted">
            Loading chats...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-wa-text-muted">
            {searchQuery ? "No chats found" : "No chats yet"}
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const { initials, color } = generateAvatar(
              contact.name,
              contact.avatarColor
            );
            return (
              <div
                key={contact.id}
                onClick={() => {
                  dispatch(setActiveChat(contact.id));
                }}
                className={`flex items-center p-4 hover:bg-wa-hover cursor-pointer transition-colors ${
                  activeChat === contact.id ? "bg-wa-bg-secondary" : ""
                }`}
              >
                <div className="relative mr-3">
                  {contact.profilePicture ? (
                    <img
                      src={`http://localhost:5000${contact.profilePicture}`}
                      alt={contact.name || contact.phone}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium"
                    style={{
                      backgroundColor: color,
                      display: contact.profilePicture ? "none" : "flex"
                    }}
                  >
                    {initials}
                  </div>
                  {contact.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-wa-green rounded-full border-2 border-wa-bg-panel"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-wa-text font-medium truncate">
                      {contact.name || contact.phone}
                    </h3>
                    <span className="text-xs text-wa-text-muted ml-2">
                      {formatTime(contact.lastMessageTime)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 flex-1 min-w-0">
                      {contact.lastMessage &&
                        contact.lastMessage.startsWith("You: ") &&
                        getStatusIcon(contact.lastMessageStatus || "sent")}
                      <p className="text-sm text-wa-text-muted truncate">
                        {contact.lastMessage}
                      </p>
                    </div>

                    {contact.unreadCount > 0 && (
                      <div className="bg-wa-green text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                        {contact.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;
