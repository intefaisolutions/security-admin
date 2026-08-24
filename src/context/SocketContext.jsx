import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let newSocket = null;
    
    if (isAuthenticated) {
      const token = localStorage.getItem('accessToken');
      
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const SOCKET_URL = API_URL.replace(/\/api$/, "");
      
      newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"]
      });

      setSocket(newSocket);
      
      newSocket.on("notification", (data) => {
        setNotifications((prev) => [data, ...prev]);
      });
    } else {
      setNotifications([]);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated]);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <SocketContext.Provider
      value={{ socket, notifications, dismissNotification }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context || { notifications: [], dismissNotification: () => {} };
};

export default SocketContext;
