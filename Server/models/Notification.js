const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['order_status', 'new_review', 'points_received'],
      required: true,
    },
    title:  { type: String, required: true },
    body:   { type: String, required: true },
    isRead: { type: Boolean, default: false },
    data: {
      // order_status
      orderId: { type: String, default: null },
      status:  { type: Number, default: null },

      // new_review + points_received
      productId: { type: String, default: null },

      // new_review
      rating:       { type: Number, default: null },
      reviewerName: { type: String, default: null },

      // points_received
      pointsReceived: { type: Number, default: null },
      totalPoints:    { type: Number, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);