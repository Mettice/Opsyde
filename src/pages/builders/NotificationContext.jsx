import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const notifiedTriggers = useRef(new Set());
  
  // Add a notification
  const addNotification = useCallback((notification) => {
    // Generate a truly unique ID
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setNotifications(prev => [
      ...prev,
      {
        id: uniqueId,
        message: notification.message,
        type: notification.type || 'info',
        timestamp: new Date()
      }
    ]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(uniqueId);
    }, 5000);
    
    return uniqueId;
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
    notifiedTriggers.current.clear();
  }, []);
  
  // Register a new trigger notification
  const registerTriggerNotification = useCallback((triggerId, executionTime) => {
    const triggerKey = `${triggerId}-${executionTime}`;
    if (!notifiedTriggers.current.has(triggerKey)) {
      notifiedTriggers.current.add(triggerKey);
      return true; // Trigger not previously registered
    }
    return false; // Trigger already registered
  }, []);
  
  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAllNotifications,
      clearNotificationHistory,
      registerTriggerNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};