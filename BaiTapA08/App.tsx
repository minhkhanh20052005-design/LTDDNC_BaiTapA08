import React, { useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ActivityIndicator } from 'react-native';
import { store, persistor } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { connectSocket, disconnectSocket } from './src/utils/socket';
import { addNewNotification } from './src/store/slices/notificationSlice';
import { getSocket } from './src/utils/socket';

// Component con để dùng được Redux hook
const AppContent = () => {
  const dispatch = useDispatch<any>();
  const { user, token } = useSelector((state: any) => state.auth);

  useEffect(() => {
    if (token && user?.id) {
      // Kết nối socket khi đăng nhập
      connectSocket(user.id);

      // Lắng nghe event notification từ server
      const socket = getSocket();
      socket?.on('notification', (notif: any) => {
        dispatch(addNewNotification(notif));
      });
    } else {
      // Ngắt kết nối khi đăng xuất
      disconnectSocket();
    }

    return () => {
      const socket = getSocket();
      socket?.off('notification');
    };
  }, [token, user?.id]);

  return <AppNavigator />;
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={<ActivityIndicator />} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
};

export default App;