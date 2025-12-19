import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React from 'react';
import { useEffect, useState } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';
import { useCheckHealthQuery } from '@/store/api/testStripsApi';
import { setHealthData, setHealthError } from '@/store/slices/healthSlice';
import NetworkStatusBanner from '@/components/network-status-banner';

export const unstable_settings = {
  anchor: '(tabs)',
};

function HealthMonitor() {
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const dispatch = useDispatch();

  // Start background health polling while the app is mounted
  // This is the single source of health data for the entire app via Redux
  // pollingInterval: 30000ms keeps checking backend every 30s (even when disconnected/errors)
  // skipPollingIfUnfocused: false ensures polling continues in background
  // refetchOnReconnect: true triggers immediate check when network reconnects
  const { data: health, error: healthError } = useCheckHealthQuery(undefined, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: false,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (healthError) {
      console.warn('Backend health check error', healthError);
      dispatch(setHealthError(healthError));
      setShowErrorBanner(true);
    } else if (health) {
      dispatch(setHealthData(health));
      setShowErrorBanner(false);
    }
  }, [health, healthError, dispatch]);

  return (
    <>
      {showErrorBanner && healthError && (
        <View style={{ position: 'absolute', top: 100, left: 0, right: 0, zIndex: 1000 }}>
          <NetworkStatusBanner
            error={(healthError as any)?.message || 'Backend unreachable'}
            onDismiss={() => setShowErrorBanner(false)}
          />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <HealthMonitor />
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </Provider>
  );
}
