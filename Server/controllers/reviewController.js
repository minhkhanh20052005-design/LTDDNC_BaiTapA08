const Review       = require('../models/Review');
const Order        = require('../models/Order');
const User         = require('../models/User');
const Wishlist     = require('../models/Wishlist');
const Notification = require('../models/Notification');
const Product      = require('../models/Product');

const POINTS_PER_REVIEW = 10;

// Helper: Tạo notification + emit socket
const createAndEmitNotification = async (userId, type, title, body, data) => {
  const notif = await Notification.create({ userId, type, title, body, data });
  if (global.io) {
    global.io.to(userId.toString()).emit('notification', notif);
  }
  return notif;
};

// 1. Gửi đánh giá
exports.createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment } = req.body;
    const userId = req.user.user.id;

    // Kiểm tra đơn hàng
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (order.status !== 4) return res.status(400).json({ message: 'Chỉ đánh giá được đơn hàng đã giao thành công' });

    // Kiểm tra sản phẩm trong đơn
    const itemInOrder = order.items.find(
      item => item.product && item.product.toString() === productId
    );
    if (!itemInOrder) return res.status(400).json({ message: 'Sản phẩm không có trong đơn hàng này' });

    // Kiểm tra đã đánh giá chưa
    const existed = await Review.findOne({ userId, productId, orderId });
    if (existed) return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });

    // Tạo đánh giá
    const review = new Review({ userId, productId, orderId, rating, comment, pointsEarned: POINTS_PER_REVIEW });
    await review.save();

    // Cộng điểm cho user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { points: POINTS_PER_REVIEW } },
      { new: true }
    );

    // Lấy thông tin sản phẩm + reviewer
    const product  = await Product.findById(productId);
    const reviewer = await User.findById(userId).select('name');

    // NOTIFICATION 1: Thông báo nhận điểm cho chính user vừa đánh giá
    await createAndEmitNotification(
      userId,
      'points_received',
      '🎁 Nhận điểm thành công',
      `Bạn vừa nhận được ${POINTS_PER_REVIEW} điểm tích lũy sau khi đánh giá "${product?.name}". Tổng điểm: ${updatedUser.points} điểm`,
      {
        productId:      productId,
        productName:    product?.name,
        productImage:   product?.image,
        pointsReceived: POINTS_PER_REVIEW,
        totalPoints:    updatedUser.points,
      }
    );

    // ✅ NOTIFICATION 2: Thông báo đánh giá mới cho user có sản phẩm trong wishlist
    const wishlists = await Wishlist.find({ products: productId });
    const notifyUserIds = wishlists
      .map(w => w.userId.toString())
      .filter(id => id !== userId.toString());

    for (const targetUserId of notifyUserIds) {
      await createAndEmitNotification(
        targetUserId,
        'new_review',
        '⭐ Đánh giá mới',
        `Sản phẩm "${product?.name}" trong danh sách yêu thích của bạn vừa nhận được đánh giá mới!`,
        {
          productId: productId,
          rating: rating,
          reviewerName: reviewer?.name,
        }
      );
    }

    res.json({ message: `Đánh giá thành công! Bạn nhận được ${POINTS_PER_REVIEW} điểm tích lũy`, review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 2. Lấy danh sách đánh giá của 1 sản phẩm
exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;
    res.json({ avgRating, totalReviews: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 3. Kiểm tra user đã đánh giá chưa
exports.checkReviewed = async (req, res) => {
  try {
    const { productId, orderId } = req.params;
    const userId  = req.user.user.id;
    const existed = await Review.findOne({ userId, productId, orderId });
    res.json({ reviewed: !!existed });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};