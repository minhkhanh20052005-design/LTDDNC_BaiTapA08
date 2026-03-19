import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  fetchNotifications, markAsRead,
  markAllAsRead, deleteNotification,
} from '../../store/slices/notificationSlice';

import axiosClient from '../../api/axiosClient';
// Icon và màu theo loại thông báo
const getTypeStyle = (type: string) => {
  switch (type) {
    case 'order_status': return { icon: 'bag-check-outline', color: '#007BFF' };
    case 'new_review': return { icon: 'star-outline', color: '#FFC107' };
    case 'points_received': return { icon: 'gift-outline', color: '#FF6B35' };
    default: return { icon: 'notifications-outline', color: '#888' };
  }
};

// Format thời gian
const formatTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const NotificationScreen = () => {
  const dispatch = useDispatch<any>();
  const navigation: any = useNavigation();
  const { notifications, status } = useSelector((state: any) => state.notification);

  // ✅ Lưu danh sách id thông báo đang được mở rộng
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, []);

  // ✅ Toggle mở rộng / thu gọn nội dung thông báo
  const handleToggleExpand = (item: any) => {
    const id = item._id;
    // Đánh dấu đã đọc khi mở rộng
    if (!item.isRead) {
      dispatch(markAsRead(id));
    }
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ✅ Navigate đến trang liên quan khi bấm "Xem nội dung được nhắc đến"
  const handleNavigate = async (item: any) => {
    if (item.type === 'order_status') {
      navigation.navigate('OrderHistory');

    } else if (item.type === 'new_review' && item.data?.productId) {
      try {
        const res = await axiosClient.get(`/products/${item.data.productId}`);
        navigation.navigate('ProductDetail', { product: res.data });
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể tải thông tin sản phẩm');
      }

    } else if (item.type === 'points_received') {
      navigation.navigate('Profile');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xóa thông báo', 'Bạn có chắc muốn xóa thông báo này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => dispatch(deleteNotification(id)) },
    ]);
  };

  const renderItem = ({ item }: any) => {
    const typeStyle = getTypeStyle(item.type);
    const isExpanded = expandedIds.includes(item._id);

    return (
      <View style={[styles.card, !item.isRead && styles.cardUnread]}>
        <View style={styles.cardRow}>
          {/* Icon loại thông báo */}
          <View style={[styles.iconBox, { backgroundColor: typeStyle.color + '20' }]}>
            <Icon name={typeStyle.icon} size={24} color={typeStyle.color} />
          </View>

          {/* Nội dung chính */}
          {/* ✅ Bấm vào thì expand, không navigate */}
          <TouchableOpacity
            style={styles.content}
            onPress={() => handleToggleExpand(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.title}>{item.title}</Text>

            {/* ✅ Khi chưa expand: cắt 2 dòng. Khi expand: hiện full */}
            <Text
              style={styles.body}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {item.body}
            </Text>

            {/* ✅ Chỉ hiện "Xem nội dung được nhắc đến" khi expand */}
            {isExpanded && (
              <TouchableOpacity
                style={styles.navigateBtn}
                onPress={() => handleNavigate(item)}
              >
                <Text style={styles.navigateBtnText}>Xem nội dung được nhắc đến</Text>
                <Icon name="chevron-forward" size={14} color="#007BFF" />
              </TouchableOpacity>
            )}

            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </TouchableOpacity>

          {/* Badge chưa đọc + Nút xóa */}
          <View style={styles.rightCol}>
            {!item.isRead && <View style={styles.unreadDot} />}
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
              <Icon name="close" size={18} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {notifications.some((n: any) => !n.isRead) ? (
          <TouchableOpacity onPress={() => dispatch(markAllAsRead())}>
            <Text style={styles.readAllText}>Đọc tất cả</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {status === 'idle' || status === 'loading' ? (
        <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 30 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="notifications-off-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={{ padding: 15 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  readAllText: { fontSize: 13, color: '#007BFF', fontWeight: '600' },

  card: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, padding: 12, elevation: 1 },
  cardUnread: { backgroundColor: '#EFF6FF', borderLeftWidth: 3, borderLeftColor: '#007BFF' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },

  iconBox: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  body: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 6 },
  time: { fontSize: 11, color: '#aaa', marginTop: 4 },

  // ✅ Nút "Xem nội dung được nhắc đến"
  navigateBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  navigateBtnText: { fontSize: 13, color: '#007BFF', fontWeight: '600', marginRight: 3 },

  rightCol: { alignItems: 'center', marginLeft: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007BFF', marginBottom: 8 },
  deleteBtn: { padding: 4 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
});

export default NotificationScreen;