import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

export function useRequireAuth(defaultMessage = 'Please login to continue.') {
  const navigation = useNavigation();
  const { user, token, isLoading } = useAuth();

  const isAuthenticated = !!(user?.id || token);

  const navigateToLogin = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root = (navigation as any)?.getParent?.()?.getParent?.() || (navigation as any)?.getParent?.();
    if (root?.navigate) {
      root.navigate('Auth');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation as any)?.navigate?.('Auth');
  }, [navigation]);

  const promptLogin = useCallback(
    (message?: string, options?: { onCancel?: () => void }) => {
      Alert.alert(
        'Login required',
        message ?? defaultMessage,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => options?.onCancel?.(),
          },
          {
            text: 'Login',
            onPress: navigateToLogin,
          },
        ],
        { cancelable: true },
      );
    },
    [defaultMessage, navigateToLogin],
  );

  const requireAuth = useCallback(
    (message?: string) => {
      if (isAuthenticated) return true;
      promptLogin(message);
      return false;
    },
    [isAuthenticated, promptLogin],
  );

  return { user, token, isLoading, isAuthenticated, promptLogin, requireAuth, navigateToLogin };
}
