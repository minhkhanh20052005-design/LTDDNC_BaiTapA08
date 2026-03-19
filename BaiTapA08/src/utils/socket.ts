import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://192.168.100.182:5000'; // Thay bằng IP server của bạn

let socket: Socket | null = null;

// Kết nối socket và join room theo userId
export const connectSocket = (userId: string) => {
  if (socket?.connected) return;

  socket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
    socket?.emit('join', userId); // Join room riêng theo userId
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });
};

// Lấy instance socket để dùng ở nơi khác
export const getSocket = (): Socket | null => socket;

// Ngắt kết nối
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket manually disconnected');
  }
};