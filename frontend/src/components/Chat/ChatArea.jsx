import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  addMessage,
  updateMessageStatus,
  fetchMessages
} from "../../store/slices/chatSlice";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";
import { format, formatDistanceToNow } from "date-fns";
import { generateAvatar } from "../../utils/avatarUtils";
import { axiosInstance } from "../../lib/axios";
import EmojiPicker from "emoji-picker-react";
import { useIsMobile } from "../../utils/useIsMobile";

const socket = io("http://localhost:5000", { reconnection: true });

const ChatArea = () => {
  const dispatch = useDispatch();
  const { activeChat, messages, contacts } = useSelector((state) => state.chat);
  const { user: authUser } = useSelector((state) => state.auth);
  const { isDark } = useSelector((state) => state.theme); 
  const isMobile = useIsMobile();
  const [message, setMessage] = useState("");
  const [showEmojiBar, setShowEmojiBar] = useState(null);
  const [showInputEmojiBar, setShowInputEmojiBar] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const user = contacts.find((c) => c.id === activeChat);
  const chatId =
    activeChat && authUser ? [authUser.id, activeChat].sort().join("_") : null;
  const { initials, color } = generateAvatar(
    user?.name || "",
    user?.avatarColor
  );
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (authUser) {
      socket.emit("join", authUser.id);
    }

    socket.on("receiveMessage", (msg) => {
      dispatch(addMessage(msg));
      if (msg.senderId !== authUser.id && chatId === msg.chatId) {
        socket.emit("messageStatus", {
          messageId: msg.id,
          status: "delivered",
          chatId: msg.chatId
        });
        axiosInstance.post(
          "/messages/status",
          { messageId: msg.id, status: "delivered", chatId: msg.chatId },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );
      }
      if (msg.senderId !== authUser.id) {
        toast.success(`From ${user?.name || "Unknown"}`);
      }
      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    });

    socket.on("messageStatusUpdate", (data) => {
      dispatch(updateMessageStatus(data));
    });

    socket.on("reactionUpdate", (data) => {
      console.log("Received reactionUpdate:", data);
      dispatch({
        type: "chat/addReaction",
        payload: data
      });
    });

    socket.on("typing", ({ userId, chatId: typingChatId }) => {
      if (userId !== authUser.id && typingChatId === chatId) {
        toast({
          title: "",
          description: `${user?.name || "Someone"} is typing...`,
          variant: "default"
        });
      }
    });

    socket.on("stopTyping", () => {});

    socket.on("userStatus", ({ userId, status, lastSeen }) => {
      dispatch({
        type: "chat/updateUserStatus",
        payload: { userId, isOnline: status === "online", lastSeen }
      });
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("messageStatusUpdate");
      socket.off("reactionUpdate");
      socket.off("typing");
      socket.off("stopTyping");
      socket.off("userStatus");
    };
  }, [authUser, activeChat, dispatch, user, chatId, isAtBottom]);

  useEffect(() => {
    if (activeChat && chatId) {
      dispatch(fetchMessages());
      const unreadMessages = (messages[chatId] || []).filter(
        (msg) => msg.senderId !== authUser.id && msg.status !== "read"
      );
      unreadMessages.forEach((msg) => {
        socket.emit("messageStatus", {
          messageId: msg.id,
          status: "read",
          chatId
        });
        axiosInstance.post(
          "/messages/status",
          { messageId: msg.id, status: "read", chatId },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );
      });
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChat, dispatch, chatId, authUser]);

  useEffect(() => {
    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const isBottom = scrollHeight - scrollTop <= clientHeight + 50;
      setIsAtBottom(isBottom);
    };

    const chatContainer = chatContainerRef.current;
    chatContainer?.addEventListener("scroll", handleScroll);
    return () => chatContainer?.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || !activeChat) {
      return;
    }
    try {
      const tempId = Date.now().toString();
      const optimisticMessage = {
        id: tempId,
        chatId,
        senderId: authUser.id,
        content: message,
        timestamp: new Date().toISOString(),
        status: "sent",
        replyTo: replyTo ? replyTo.id : null,
        reactions: []
      };
      dispatch(addMessage(optimisticMessage));
      socket.emit("sendMessage", {
        receiverId: activeChat,
        senderId: authUser.id,
        content: message,
        replyTo: replyTo ? replyTo.id : null
      });
      setMessage("");
      setReplyTo(null);
      setShowInputEmojiBar(false);
      socket.emit("typing", { chatId, userId: authUser.id });
      setTimeout(() => {
        socket.emit("stopTyping", { chatId, userId: authUser.id });
      }, 1000);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowInputEmojiBar(false);
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const message = messages[chatId]?.find((msg) => msg.id === messageId);
      if (!message) {
        console.error("Message not found:", messageId);
        return;
      }
      if (
        message.reactions.some(
          (r) => r.emoji === emoji && r.userId === authUser.id
        )
      ) {
        setShowEmojiBar(null);
        return;
      }

      const response = await axios.post(
        "http://localhost:5000/api/messages/react",
        { messageId, userId: authUser.id, emoji, chatId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      console.log("Reaction API response:", response.data);
      socket.emit("reactionUpdate", {
        messageId,
        userId: authUser.id,
        emoji,
        chatId
      });
      setShowEmojiBar(null);
    } catch (error) {
      console.error("Error sending reaction:", error.response?.data || error);
    }
  };

  const handleMessageClick = (msg) => {
    setReplyTo(msg);
  };

  const getStatusText = () => {
    if (!user) return "";
    if (user.isOnline) return "online";
    if (user.lastSeen) {
      return `last seen ${formatDistanceToNow(new Date(user.lastSeen), {
        addSuffix: true
      })}`;
    }
    return "";
  };

  return (
    <div className="flex-1 flex flex-col bg-wa-bg h-full">
      {activeChat ? (
        <>
          <div className="bg-wa-bg-panel p-4 border-b border-wa-border flex items-center">
            <div className="relative mr-3">
              {user?.profilePicture ? (
                <img
                  src={`http://localhost:5000${user.profilePicture}`}
                  alt={user.name || user.phone || "User"}
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
            <div>
              <h2 className="text-wa-text font-medium">
                {user?.name || user?.phone}
              </h2>
              <p className="text-xs text-wa-text-muted">{getStatusText()}</p>
            </div>
          </div>
          <div
            className="flex-1 overflow-y-auto p-4 bg-[url('https://web.whatsapp.com/img/bg-chat-tile_9e8a2898faedb7f9b7d8d4301bd1b6f8.png')] dark:bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e6b8b8e9b8b3c2d8e4fa6f5f6.png')] bg-repeat"
            ref={chatContainerRef}
          >
            {chatId && messages[chatId] ? (
              messages[chatId].map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-3 p-2.5 rounded-2xl max-w-[80%] sm:max-w-[45%] relative group shadow-sm break-words ${
                    msg.senderId === authUser.id
                      ? "bg-wa-green text-white ml-auto rounded-tl-2xl rounded-br-sm"
                      : "bg-white dark:bg-wa-bg-secondary text-wa-text dark:text-wa-text mr-auto rounded-tr-2xl rounded-bl-sm"
                  }`}
                  onClick={() => handleMessageClick(msg)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowEmojiBar(msg.id);
                  }}
                >
                  {msg.replyTo &&
                    messages[chatId].find((m) => m.id === msg.replyTo) && (
                      <div className="bg-gray-100 dark:bg-wa-bg-panel-dark text-gray-800 dark:text-wa-text-dark p-2 rounded-lg border-l-4 border-wa-green mb-1.5 max-w-full break-words">
                        <p className="text-xs font-semibold text-wa-green">
                          {msg.senderId === authUser.id
                            ? "You"
                            : user?.name || user?.phone}
                        </p>
                        <p className="text-xs italic truncate max-w-[90%]">
                          {messages[chatId]
                            .find((m) => m.id === msg.replyTo)
                            .content.slice(0, 50)}
                          ...
                        </p>
                      </div>
                    )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className="flex items-center justify-end text-xs text-wa-text-muted dark:text-wa-text-muted-dark mt-1">
                    <span>{format(new Date(msg.timestamp), "HH:mm")}</span>
                    {msg.senderId === authUser.id && (
                      <span className="ml-1.5">
                        {getStatusIcon(msg.status)}
                      </span>
                    )}
                  </div>
                  {msg.reactions?.length > 0 && (
                    <div className="flex space-x-1 absolute -bottom-3 left-2 bg-white dark:bg-wa-bg-secondary-dark rounded-full px-1.5 py-0.5 shadow-sm border border-gray-200 dark:border-gray-600 z-10">
                      {msg.reactions.map((reaction, index) => (
                        <span
                          key={`${reaction.userId}-${reaction.emoji}-${index}`}
                          className={`text-sm ${
                            reaction.userId === authUser.id
                              ? "bg-gray-300 dark:bg-gray-600 rounded-full px-1"
                              : ""
                          }`}
                        >
                          {reaction.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                  {showEmojiBar === msg.id && (
                    <div className="absolute -bottom-10 left-2  bg-white dark:bg-wa-bg-panel rounded-lg p-2 shadow-md border border-gray-200 dark:border-gray-600 z-20">
                      <EmojiPicker
                        onEmojiClick={(emojiObject) => {
                          handleReact(msg.id, emojiObject.emoji);
                          setShowEmojiBar(null);
                        }}
                        width={isMobile ? "100%" : 300}
                        height={300}
                      />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-wa-text-muted dark:text-wa-text-muted-dark">
                No messages yet
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-2 sm:p-4 bg-wa-bg-panel dark:bg-wa-bg-panel-dark border-t border-wa-border dark:border-wa-border-dark">
            {replyTo && (
              <div className=" bg-white dark:bg-wa-bg-panel p-2 mb-2 rounded-lg flex justify-between items-center border border-gray-200 dark:border-gray-600 max-w-full">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-wa-green">
                    Replying to{" "}
                    {replyTo.senderId === authUser.id
                      ? "yourself"
                      : user?.name || user?.phone}
                  </p>
                  <p className="text-xs text-wa-text-muted dark:text-wa-text-muted-dark italic truncate max-w-[90%]">
                    {replyTo.content.slice(0, 50)}...
                  </p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-xs text-wa-green hover:text-wa-green-dark"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex items-center relative max-w-full">
              <button
                onClick={() => setShowInputEmojiBar(!showInputEmojiBar)}
                className="p-2 text-wa-text-muted dark:text-wa-text-muted-dark hover:text-wa-text dark:hover:text-wa-text-dark flex-shrink-0"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-4 9c0-1.1.9-2 2-2s2 .9 2 2-2 2-2 2-2-.9-2-2zm6 0c0-1.1.9-2 2-2s2 .9 2 2-2 2-2 2-2-.9-2-2zm-2 7c-2.76 0-5.26-1.62-6.29-4h12.58c-1.03 2.38-3.53 4-6.29 4z" />
                </svg>
              </button>
              {showInputEmojiBar && (
                <div className="absolute bottom-12 sm:bottom-16 left-0  bg-white dark:bg-wa-bg-panel rounded-lg p-2 shadow-md border border-gray-200 dark:border-gray-600 z-10 w-full sm:w-80">
                  <EmojiPicker
                    onEmojiClick={(emojiObject) =>
                      handleEmojiClick(emojiObject)
                    }
                    width={isMobile ? "100%" : 300}
                    height={300}
                  />
                </div>
              )}
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                  socket.emit("typing", { chatId, userId: authUser.id });
                }}
                placeholder="Type a message"
                className="flex-1 p-2 b bg-white dark:bg-wa-bg-panel border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-wa-green text-sm min-w-0 text-wa-text dark:text-wa-text-dark"
              />
              <button
                onClick={handleSendMessage}
                className="ml-2 p-2 bg-wa-green text-white rounded-full hover:bg-wa-green-dark flex-shrink-0"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-wa-text-muted dark:text-wa-text-muted-dark">
          Select a chat to start messaging
        </div>
      )}
    </div>
  );
};

const getStatusIcon = (status) => {
  switch (status) {
    case "sent":
      return <div className="w-4 h-4 text-white">✓</div>;
    case "delivered":
      return <div className="w-4 h-4 text-white">✓✓</div>;
    case "read":
      return <div className="w-4 h-4 text-blue-500">✓✓</div>;
    default:
      return null;
  }
};

export default ChatArea;
