import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import axiosClient from '../../api/axiosClient';

// ✅ Tạo danh sách 6 tháng gần nhất (tháng hiện tại + 5 tháng trước)
const getLast6Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: `Tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`,
      month: d.getMonth(),       // 0-indexed
      year:  d.getFullYear(),
    });
  }
  return months;
};

// ✅ Lọc đơn hàng theo tháng-năm
const filterByMonth = (orders: any[], month: number, year: number) =>
  orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getMonth() === month && d.getFullYear() === year;
  });

// ✅ Tính tổng tiền từ danh sách đơn
const sumTotal = (orders: any[]) =>
  orders.reduce((sum, o) => sum + o.totalPrice, 0);

const SpendingStatsScreen = () => {
  const navigation: any = useNavigation();

  const monthOptions = useMemo(() => getLast6Months(), []);

  const [selectedOption, setSelectedOption] = useState(monthOptions[0]); // Mặc định tháng hiện tại
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [orders,         setOrders]         = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);

  // Fetch tất cả đơn hàng 1 lần, lọc trên client
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get('/orders');
        setOrders(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // ✅ Lọc đơn theo tháng đang chọn
  const filteredOrders = useMemo(
    () => filterByMonth(orders, selectedOption.month, selectedOption.year),
    [orders, selectedOption]
  );

  // ✅ Phân loại theo trạng thái
  const pendingOrders  = filteredOrders.filter(o => o.status === 1 || o.status === 2); // Chờ xác nhận + Đã xác nhận
  const shippingOrders = filteredOrders.filter(o => o.status === 3);                   // Đang giao
  const deliveredOrders= filteredOrders.filter(o => o.status === 4);                   // Đã giao thành công
  const cancelledOrders= filteredOrders.filter(o => o.status === 5);                   // Đã hủy

  // ✅ Tổng chi tiêu thực tế (chỉ tính đơn thành công)
  const totalSpent = sumTotal(deliveredOrders);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thống kê chi tiêu</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ✅ Tiêu đề đẹp */}
        <View style={styles.heroSection}>
          <Icon name="bar-chart" size={36} color="#007BFF" />
          <Text style={styles.heroTitle}>Thống kê chi tiêu hàng tháng của bạn</Text>
          <Text style={styles.heroSubtitle}>Theo dõi và quản lý chi tiêu thông minh hơn</Text>
        </View>

        {/* ✅ Dropdown chọn tháng */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Chọn tháng xem thống kê</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDropdown(true)}
          >
            <Icon name="calendar-outline" size={18} color="#007BFF" />
            <Text style={styles.dropdownText}>{selectedOption.label}</Text>
            <Icon name="chevron-down" size={18} color="#007BFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ✅ Tổng chi tiêu nổi bật */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Tổng chi tiêu trong tháng</Text>
              <Text style={styles.totalAmount}>{totalSpent.toLocaleString()}đ</Text>
              <Text style={styles.totalNote}>* Chỉ tính các đơn đã giao thành công</Text>
            </View>

            {/* ✅ Chi tiết theo trạng thái */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Chi tiết theo trạng thái</Text>

              {/* Chờ xác nhận */}
              <View style={[styles.statCard, { borderLeftColor: '#007BFF' }]}>
                <View style={styles.statCardLeft}>
                  <View style={[styles.statDot, { backgroundColor: '#007BFF' }]} />
                  <View>
                    <Text style={styles.statCardTitle}>Chờ xác nhận</Text>
                    <Text style={styles.statCardCount}>{pendingOrders.length} đơn hàng</Text>
                  </View>
                </View>
                <View style={styles.statCardRight}>
                  <Text style={styles.statCardAmount}>
                    {sumTotal(pendingOrders).toLocaleString()}đ
                  </Text>
                </View>
              </View>

              {/* Đang giao */}
              <View style={[styles.statCard, { borderLeftColor: '#17a2b8' }]}>
                <View style={styles.statCardLeft}>
                  <View style={[styles.statDot, { backgroundColor: '#17a2b8' }]} />
                  <View>
                    <Text style={styles.statCardTitle}>Đang giao hàng</Text>
                    <Text style={styles.statCardCount}>{shippingOrders.length} đơn hàng</Text>
                  </View>
                </View>
                <View style={styles.statCardRight}>
                  <Text style={styles.statCardAmount}>
                    {sumTotal(shippingOrders).toLocaleString()}đ
                  </Text>
                </View>
              </View>

              {/* Đã giao thành công */}
              <View style={[styles.statCard, { borderLeftColor: '#28a745' }]}>
                <View style={styles.statCardLeft}>
                  <View style={[styles.statDot, { backgroundColor: '#28a745' }]} />
                  <View>
                    <Text style={styles.statCardTitle}>Đã giao thành công</Text>
                    <Text style={styles.statCardCount}>{deliveredOrders.length} đơn hàng</Text>
                  </View>
                </View>
                <View style={styles.statCardRight}>
                  <Text style={[styles.statCardAmount, { color: '#28a745' }]}>
                    {sumTotal(deliveredOrders).toLocaleString()}đ
                  </Text>
                </View>
              </View>

              {/* Đã hủy */}
              <View style={[styles.statCard, { borderLeftColor: '#dc3545' }]}>
                <View style={styles.statCardLeft}>
                  <View style={[styles.statDot, { backgroundColor: '#dc3545' }]} />
                  <View>
                    <Text style={styles.statCardTitle}>Đã hủy</Text>
                    <Text style={styles.statCardCount}>{cancelledOrders.length} đơn hàng</Text>
                  </View>
                </View>
                <View style={styles.statCardRight}>
                  <Text style={[styles.statCardAmount, { color: '#dc3545' }]}>
                    {sumTotal(cancelledOrders).toLocaleString()}đ
                  </Text>
                </View>
              </View>
            </View>

            {/* ✅ Trống */}
            {filteredOrders.length === 0 && (
              <View style={styles.empty}>
                <Icon name="receipt-outline" size={50} color="#ccc" />
                <Text style={styles.emptyText}>Không có đơn hàng nào trong {selectedOption.label}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ✅ Modal dropdown chọn tháng */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Chọn tháng</Text>
            <FlatList
              data={monthOptions}
              keyExtractor={(item) => `${item.month}-${item.year}`}
              renderItem={({ item }) => {
                const isSelected =
                  item.month === selectedOption.month &&
                  item.year  === selectedOption.year;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      setSelectedOption(item);
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Icon name="checkmark" size={18} color="#007BFF" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#f5f5f5' },
  header:                 { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', elevation: 2 },
  headerTitle:            { fontSize: 18, fontWeight: 'bold' },

  // Hero section
  heroSection:            { alignItems: 'center', backgroundColor: '#fff', padding: 24, marginBottom: 12 },
  heroTitle:              { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', textAlign: 'center', marginTop: 12, marginBottom: 6 },
  heroSubtitle:           { fontSize: 13, color: '#888', textAlign: 'center' },

  // Dropdown
  section:                { backgroundColor: '#fff', padding: 15, marginBottom: 12 },
  sectionLabel:           { fontSize: 13, color: '#888', marginBottom: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dropdown:               { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#007BFF', borderRadius: 10, padding: 12, backgroundColor: '#F0F7FF' },
  dropdownText:           { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600', color: '#007BFF' },

  // Tổng chi tiêu
  totalCard:              { backgroundColor: '#007BFF', margin: 15, borderRadius: 16, padding: 24, alignItems: 'center', elevation: 4 },
  totalLabel:             { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  totalAmount:            { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  totalNote:              { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  // Stat cards
  statCard:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4, elevation: 1 },
  statCardLeft:           { flexDirection: 'row', alignItems: 'center' },
  statDot:                { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  statCardTitle:          { fontSize: 14, fontWeight: '600', color: '#333' },
  statCardCount:          { fontSize: 12, color: '#888', marginTop: 2 },
  statCardRight:          { alignItems: 'flex-end' },
  statCardAmount:         { fontSize: 15, fontWeight: 'bold', color: '#333' },

  // Empty
  empty:                  { alignItems: 'center', padding: 40 },
  emptyText:              { fontSize: 14, color: '#999', marginTop: 12, textAlign: 'center' },

  // Modal
  modalOverlay:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox:               { width: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: 400 },
  modalTitle:             { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  modalItem:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
  modalItemSelected:      { backgroundColor: '#F0F7FF' },
  modalItemText:          { fontSize: 15, color: '#333' },
  modalItemTextSelected:  { color: '#007BFF', fontWeight: 'bold' },
});

export default SpendingStatsScreen;