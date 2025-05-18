import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Create context
const NotificationContext = createContext(null);

// Hook to use the Notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification Provider component
export const NotificationProvider = ({ children }) => {
  // Notifications state - array of { id, message, type, timestamp }
  const [notifications, setNotifications] = useState([]);
  
  // Add a notification
  const addNotification = useCallback((notification) => {
    const id = notification.id || uuidv4();
    const timestamp = notification.timestamp || new Date().toISOString();
    const type = notification.type || 'info';
    
    setNotifications(prev => [...prev, {
      id,
      message: notification.message,
      type,
      timestamp
    }]);
    
    // Auto-remove if not persistent
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, 5000); // 5 seconds
    }
    
    return id;
  }, []);
  
  // Remove a notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // Clear notification history
  const clearNotificationHistory = useCallback(() => {
    // This could optionally keep some notifications, e.g., persistent ones
    setNotifications([]);
  }, []);
  
  // Context value
  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    clearNotificationHistory
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 