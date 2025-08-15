import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface TokenNotification {
  token: string;
  rideId: string;
  customerName: string;
  customerId: string;
  driverName: string;
  expiresAt: string;
}

interface TokenNotificationContextType {
  showTokenNotification: (notification: TokenNotification) => void;
  hideTokenNotification: () => void;
  currentNotification: TokenNotification | null;
  isVisible: boolean;
  checkActiveTokens: () => Promise<void>;
}

const TokenNotificationContext = createContext<TokenNotificationContextType | undefined>(undefined);

export const useTokenNotification = () => {
  const context = useContext(TokenNotificationContext);
  if (context === undefined) {
    throw new Error('useTokenNotification must be used within a TokenNotificationProvider');
  }
  return context;
};

interface TokenNotificationProviderProps {
  children: ReactNode;
}

export const TokenNotificationProvider: React.FC<TokenNotificationProviderProps> = ({ children }) => {
  const [currentNotification, setCurrentNotification] = useState<TokenNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();
  const pollingIntervalRef = useRef<number | null>(null);

  const showTokenNotification = useCallback((notification: TokenNotification) => {
    setCurrentNotification(notification);
    setIsVisible(true);
  }, []);

  const hideTokenNotification = useCallback(() => {
    setIsVisible(false);
    setCurrentNotification(null);
  }, []);

  const checkActiveTokens = useCallback(async () => {
    try {
      if (!user?.id) return;

      console.log('🔍 Checking for active tokens from database...');
      const response = await api.get('/api/ride-history/customer/active-tokens');
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const activeTokens = response.data.data;
        const activeToken = activeTokens[0]; // Get the most recent active token
        
        console.log('✅ Found active tokens from database:', activeTokens.length);
        
        // Check if the current notification's token is still in the active tokens list
        if (currentNotification) {
          const isCurrentTokenStillActive = activeTokens.some(
            (token: any) => token.token === currentNotification.token
          );
          
          if (!isCurrentTokenStillActive) {
            // Current token is no longer active (used or expired)
            console.log('🚫 Token notification auto-closing - token used or expired');
            hideTokenNotification();
            return;
          } else {
            console.log('🔄 Current token is still active');
          }
        }
        
        // Show new token notification if we don't have one or if it's different
        if (!currentNotification || currentNotification.token !== activeToken.token) {
          console.log('🆕 Showing new token notification');
          showTokenNotification({
            token: activeToken.token,
            rideId: activeToken.rideId,
            customerName: 'You',
            customerId: user.id,
            driverName: activeToken.driverName,
            expiresAt: activeToken.expiresAt,
          });
        }
      } else {
        console.log('ℹ️ No active tokens found in database');
        // Hide notification if no active tokens found (token was used or expired)
        if (currentNotification) {
          console.log('🚫 Token notification auto-closing - no active tokens found');
          hideTokenNotification();
        }
      }
    } catch (error) {
      console.error('❌ Error checking active tokens:', error);
      // If there's an error, we should also hide the notification to be safe
      if (currentNotification) {
        console.log('🚫 Token notification auto-closing due to error');
        hideTokenNotification();
      }
    }
  }, [user?.id, showTokenNotification, currentNotification, hideTokenNotification]);

  // Start polling when user is authenticated
  useEffect(() => {
    if (user?.id) {
      // Clear any existing interval first
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Initial check
      checkActiveTokens();
      
      // Set up polling every 15 seconds
      pollingIntervalRef.current = setInterval(() => {
        checkActiveTokens();
      }, 15000); // 15 seconds

      console.log('🚀 Started token notification polling every 15 seconds');
    }

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('🛑 Stopped token notification polling');
      }
    };
  }, [user?.id, checkActiveTokens]);

  return (
    <TokenNotificationContext.Provider
      value={{
        showTokenNotification,
        hideTokenNotification,
        currentNotification,
        isVisible,
        checkActiveTokens,
      }}
    >
      {children}
    </TokenNotificationContext.Provider>
  );
}; 