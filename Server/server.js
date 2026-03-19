const express    = require('express');
const http       = require('http');           
const { Server } = require('socket.io');      
const cors       = require('cors');
const dotenv     = require('dotenv');
const connectDB  = require('./config/db');

dotenv.config();
connectDB();

const app        = express();
const httpServer = http.createServer(app);    

//  Khởi tạo Socket.IO
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

//  Export io để dùng trong các controller
global.io = io;

// Khi client kết nối socket
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // Client gửi userId lên để join room riêng
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`✅ User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/products',      require('./routes/productRoutes'));
app.use('/api/cart',          require('./routes/cartRoutes'));
app.use('/api/orders',        require('./routes/orderRoutes'));
app.use('/api/reviews',       require('./routes/reviewRoutes'));
app.use('/api/wishlist',      require('./routes/wishlistRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes')); 

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`)); //httpServer thay vì app