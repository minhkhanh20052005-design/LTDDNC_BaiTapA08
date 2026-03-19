import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';

// Lấy danh sách thông báo từ server
export const fetchNotifications = createAsyncThunk(
  'notification/fetch',
  async () => {
    const res = await axiosClient.get('/notifications');
    return res.data;
  }
);

// Đánh dấu 1 thông báo đã đọc
export const markAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (id: string) => {
    await axiosClient.put(`/notifications/${id}/read`);
    return id;
  }
);

// Đánh dấu tất cả đã đọc
export const markAllAsRead = createAsyncThunk(
  'notification/markAllAsRead',
  async () => {
    await axiosClient.put('/notifications/read-all');
  }
);

// Xóa 1 thông báo
export const deleteNotification = createAsyncThunk(
  'notification/delete',
  async (id: string) => {
    await axiosClient.delete(`/notifications/${id}`);
    return id;
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    notifications: [] as any[],
    unreadCount:   0,
    status:        'idle',
  },
  reducers: {
    // ✅ Nhận thông báo mới real-time từ socket
    addNewNotification: (state, action: PayloadAction<any>) => {
      state.notifications.unshift(action.payload); // Thêm vào đầu danh sách
      state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload.notifications;
        state.unreadCount   = action.payload.unreadCount;
        state.status        = 'succeeded';
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notif = state.notifications.find(n => n._id === action.payload);
        if (notif && !notif.isRead) {
          notif.isRead     = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(n => n.isRead = true);
        state.unreadCount = 0;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notif = state.notifications.find(n => n._id === action.payload);
        if (notif && !notif.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(n => n._id !== action.payload);
      });
  },
});

export const { addNewNotification } = notificationSlice.actions;
export default notificationSlice.reducer;