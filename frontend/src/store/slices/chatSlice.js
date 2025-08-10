import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { axiosInstance } from '../../lib/axios';

export const fetchContacts = createAsyncThunk('chat/fetchContacts', async (_, { getState }) => {
  const { token } = getState().auth;
  const response = await axiosInstance.get('/auth/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("fetchContacts response:", response.data);
  return response.data;
});

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async (_, { getState }) => {
  const { token } = getState().auth;
  const response = await axiosInstance.get('/messages', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
});

export const sendReaction = createAsyncThunk('chat/sendReaction', async ({ messageId, emoji }, { getState }) => {
  const { token } = getState().auth;
  const response = await axiosInstance.post('/messages/react', { messageId, emoji, userId: getState().auth.user.id }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { messageId, emoji, userId: getState().auth.user.id };
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    contacts: [],
    activeChat: null,
    searchQuery: '',
    messages: {},
    status: 'idle',
    error: null,
  },
  reducers: {
    setActiveChat: (state, action) => {
      state.activeChat = action.payload;
      const contact = state.contacts.find((c) => c.id === action.payload);
      if (contact) {
        contact.unreadCount = 0;
      }
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    addMessage: (state, action) => {
      const { chatId, id, senderId, content, timestamp, status, replyTo } = action.payload;
      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      if (!state.messages[chatId].find((msg) => msg.id === id)) {
        state.messages[chatId].push({ id, senderId, content, timestamp, status, replyTo, reactions: [] });
      }
      const userId = state.auth?.user?.id;
      const otherUserId = chatId.split('_').find((id) => id !== userId);
      const contact = state.contacts.find((c) => c.id === otherUserId);
      if (contact) {
        contact.lastMessage = senderId === userId ? `You: ${content}` : content;
        contact.lastMessageTime = timestamp;
        if (state.activeChat !== otherUserId && senderId !== userId) {
          contact.unreadCount = (contact.unreadCount || 0) + 1;
        }
        state.contacts = [...state.contacts].sort((a, b) =>
          new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0)
        );
      }
    },
    updateMessageStatus: (state, action) => {
      const { messageId, status, chatId } = action.payload;
      const messages = state.messages[chatId] || [];
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        message.status = status;
      }
      const userId = state.auth?.user?.id;
      const otherUserId = chatId.split('_').find((id) => id !== userId);
      const contact = state.contacts.find((c) => c.id === otherUserId);
      if (contact && messages.length > 0) {
        contact.lastMessage = messages[messages.length - 1].senderId === userId
          ? `You: ${messages[messages.length - 1].content}`
          : messages[messages.length - 1].content;
        contact.lastMessageTime = messages[messages.length - 1].timestamp;
        contact.lastMessageStatus = messages[messages.length - 1].status;
       
        state.contacts = [...state.contacts].sort((a, b) =>
          new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0)
        );
      }
    },
    addReaction: (state, action) => {
      const { messageId, userId, emoji, chatId } = action.payload;
      const messages = state.messages[chatId] || [];
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        message.reactions = message.reactions || [];
        message.reactions.push({ userId, emoji });
      }
    },
    updateUserStatus: (state, action) => {
      const { userId, status } = action.payload;
      const contact = state.contacts.find((c) => c.id === userId);
      if (contact) {
        contact.isOnline = status === 'online';
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.contacts = action.payload.map((user) => ({
          id: user.id,
          name: user.username,
          phone: user.phone,
          profilePicture: user.profilePicture,
          avatarColor: user.avatarColor,
          isOnline: user.isOnline || false,
          socketId: user.socketId,
          lastMessage: '',
          lastMessageTime: null,
          lastMessageStatus: 'sent',
          unreadCount: 0,
        }));
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const userId = state.auth?.user?.id;
        const messagesByChat = action.payload.reduce((acc, msg) => {
          const chatId = msg.chatId;
          if (!acc[chatId]) acc[chatId] = [];
          acc[chatId].push({
            id: msg._id,
            content: msg.content,
            timestamp: msg.timestamp,
            senderId: msg.senderId,
            status: msg.status,
            replyTo: msg.replyTo,
            reactions: msg.reactions || [],
          });
          return acc;
        }, {});
        state.messages = messagesByChat;
        state.contacts = state.contacts.map((contact) => {
          const otherUserId = contact.id;
          const possibleChatIds = [
            `${userId}_${otherUserId}`,
            `${otherUserId}_${userId}`,
          ];
          const chatId = Object.keys(messagesByChat).find((id) => possibleChatIds.includes(id));
          const chatMessages = chatId ? messagesByChat[chatId] : [];
          const lastMessage = chatMessages[chatMessages.length - 1];
          return {
            ...contact,
            lastMessage: lastMessage
              ? lastMessage.senderId === userId
                ? `You: ${lastMessage.content}`
                : lastMessage.content
              : '',
            lastMessageTime: lastMessage ? lastMessage.timestamp : null,
            lastMessageStatus: lastMessage ? lastMessage.status : 'sent',
            unreadCount: chatMessages.filter(
              (m) => m.status !== 'read' && m.senderId !== userId
            ).length,
          };
        }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
      })
      .addCase(sendReaction.fulfilled, (state, action) => {
        const { messageId, userId, emoji, chatId } = action.payload;
        const messages = state.messages[chatId] || [];
        const message = messages.find((m) => m.id === messageId);
        if (message) {
          message.reactions = message.reactions || [];
          message.reactions.push({ userId, emoji });
        }
      });
  },
});

export const { setActiveChat, setSearchQuery, addMessage, updateMessageStatus, addReaction, updateUserStatus } = chatSlice.actions;
export default chatSlice.reducer;
