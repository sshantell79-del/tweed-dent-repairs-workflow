import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_COLORS } from '../types';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
}

export default function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || '#6B7280';

  const sizeStyles = {
    small: { paddingVertical: 2, paddingHorizontal: 8, fontSize: 10 },
    medium: { paddingVertical: 4, paddingHorizontal: 12, fontSize: 12 },
    large: { paddingVertical: 6, paddingHorizontal: 16, fontSize: 14 },
  };

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }, { paddingVertical: sizeStyles[size].paddingVertical, paddingHorizontal: sizeStyles[size].paddingHorizontal }]}>
      <Text style={[styles.text, { color, fontSize: sizeStyles[size].fontSize }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
