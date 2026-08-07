import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, accessToken } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
    const newSocket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    setSocket(newSocket);

    const addNotice = (eventLabel, data) => {
      const text = typeof data === 'string' ? data : (data?.message || data?.name ? `New ${eventLabel}: ${data?.name || data?.message}` : `New ${eventLabel} event received`);
      const id = Date.now() + Math.random();
      setNotifications((prev) => [...prev, { id, title: eventLabel, text, time: new Date().toLocaleTimeString() }]);
    };

    newSocket.on('residentCreated', (data) => addNotice('Resident Created', data));
    newSocket.on('guardCreated', (data) => addNotice('Guard Created', data));
    newSocket.on('serviceCreated', (data) => addNotice('Service Provider Created', data));
    newSocket.on('adminCreated', (data) => addNotice('Admin Account Created', data));
    newSocket.on('societyCreated', (data) => addNotice('Society Created', data));

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, accessToken]);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, dismissNotification }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context || { notifications: [], dismissNotification: () => {} };
};

export default SocketContext;
