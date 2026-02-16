import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="job/add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="job/edit/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
