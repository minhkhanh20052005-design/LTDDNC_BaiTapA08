const Order        = require('../models/Order');
const Cart         = require('../models/Cart');
const User         = require('../models/User');
const Notification = require('../models/Notification');

// Helper: map status sang text
const getStatusText = (status) => {
  switch (status) {
    case 2: return { title: '🛍️ Đơn hàng đã xác nhận',   body: 'Shop đang chuẩn bị hàng cho bạn!' };
    case 3: return { title: '🚚 Đơn hàng đang giao',      body: 'Đơn hàng đang trên đường đến bạn. Vui lòng chú ý điện thoại!' };
    case 4: return { title: '✅ Giao hàng thành công',     body: 'Đơn hàng đã giao thành công. Hãy đánh giá sản phẩm để nhận 10 điểm!' };
    case 5: return { title: '❌ Đơn hàng đã hủy',         body: 'Đơn hàng của bạn đã bị hủy.' };
    default: return null;
  }
};

// Helper: Tạo notification + emit socket
const createAndEmitNotification = async (userId, type, title, body, data) => {
  const notif = await Notification.create({ userId, type, title, body, data });
  if (global.io) {
    global.io.to(userId.toString()).emit('notification', notif);
  }
};

// 1. TẠO ĐƠN HÀNG
exports.createOrder = async (req, res) => {
  try {
    const { address, phone, paymentMethod, items, totalPrice, name, pointsUsed } = req.body;
    const userId = req.user.user.id;

    const newOrder = new Order({
      userId, items, totalPrice,
      address, phone,
      receiverName: name,
      paymentMethod,
      status: 1,
    });
    await newOrder.save();

    // Xóa sản phẩm đã mua khỏi giỏ hàng
    const productIdsBought = items.map(item => item.product);
    await Cart.findOneAndUpdate(
      { userId },
      { $pull: { products: { product: { $in: productIdsBought } } } }
    );

    // Trừ điểm nếu user dùng điểm tích lũy
    if (pointsUsed && pointsUsed > 0) {
      await User.findByIdAndUpdate(userId, { $inc: { points: -pointsUsed } });
    }

    res.json({ message: 'Đặt hàng thành công', orderId: newOrder._id });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Lỗi server khi đặt hàng' });
  }
};

// 2. LẤY DANH SÁCH ĐƠN HÀNG (Tự động cập nhật trạng thái sau 30p)
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.user.id;
    let orders   = await Order.find({ userId }).populate('items.product').sort({ createdAt: -1 });
    const now    = new Date();

    const updatePromises = orders.map(async (order) => {
      if (order.status === 1) {
        const diffMinutes = (now - new Date(order.createdAt)) / 60000;
        if (diffMinutes >= 30) {
          const oldStatus = order.status;
          order.status    = 2;
          await order.save();

          // Emit notification khi status tự động đổi 1 → 2
          const statusText = getStatusText(2);
          if (statusText) {
            await createAndEmitNotification(
              userId, 'order_status',
              statusText.title,
              statusText.body,
              { orderId: order._id.toString(), status: 2 }
            );
          }
        }
      }
      return order;
    });

    await Promise.all(updatePromises);
    orders = await Order.find({ userId }).populate('items.product').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 3. HỦY ĐƠN HÀNG
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId      = req.user.user.id;
    const order       = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (order.status !== 1) {
      return res.status(400).json({ message: 'Không thể hủy đơn hàng này (đã xác nhận hoặc đang giao)' });
    }

    order.status = 5;
    await order.save();

    //  Emit notification khi hủy đơn
    const statusText = getStatusText(5);
    if (statusText) {
      await createAndEmitNotification(
        order.userId, 'order_status',
        statusText.title,
        statusText.body,
        { orderId: orderId, status: 5 }
      );
    }

    res.json({ message: 'Đã hủy đơn hàng' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 4. API TẠO DỮ LIỆU DEMO
exports.seedDemoOrders = async (req, res) => {
  try {
    const userId   = req.user.user.id;
    const products = await require('../models/Product').find().limit(2);
    const demoOrders = [
      {
        userId, status: 3, totalPrice: 500000,
        address: 'Demo Address', phone: '0999999999',
        items: [], createdAt: new Date(Date.now() - 86400000),
      },
      {
        userId, status: 4,
        totalPrice: products.reduce((s, p) => s + p.price, 0),
        address: 'Demo Address', phone: '0999999999',
        items: products.map(p => ({
          product: p._id, name: p.name, image: p.image, quantity: 1, price: p.price,
        })),
        createdAt: new Date(Date.now() - 172800000),
      },
    ];
    await Order.insertMany(demoOrders);
    res.json({ message: 'Đã tạo đơn hàng demo' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};