import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type Props = {
  error: string | null;
  onDismiss: () => void;
};

export default function NetworkStatusBanner({ error, onDismiss }: Props) {
  if (!error) return null;
  const message = 'Sorry, there is a network issue. Please check your connection.';
  return (
    <View style={styles.errorBanner}>
      <ThemedText style={styles.errorText}>{message}</ThemedText>
      <Button title="Dismiss" onPress={onDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#b00020',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorText: {
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },

});
