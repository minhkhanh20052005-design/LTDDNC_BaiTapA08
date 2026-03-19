const Notification = require('../models/Notification');

// 1. Lấy danh sách thông báo của user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.user.id;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 2. Đánh dấu 1 thông báo đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId  = req.user.user.id;
    await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true }
    );
    res.json({ message: 'Đã đánh dấu đã đọc' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 3. Đánh dấu tất cả đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.user.id;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    res.json({ message: 'Đã đánh dấu tất cả đã đọc' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 4. Xóa 1 thông báo
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId  = req.user.user.id;
    await Notification.findOneAndDelete({ _id: id, userId });
    res.json({ message: 'Đã xóa thông báo' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};