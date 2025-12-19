import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Button, Image, StyleSheet, View, Alert, Modal, TouchableOpacity, Text } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { HelloWave } from '@/components/hello-wave';
import ParallexScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUploadPhotoMutation } from '@/store/api/testStripsApi';
import type { RootState } from '@/store';
import ParallaxScrollView from '@/components/parallax-scroll-view';

export default function HomeScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraRef = useRef<Camera | null>(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const isActive = cameraOpen && !!device;

  const [uploadPhoto, { isLoading: uploadLoading, error: uploadError, data: uploadData }] = useUploadPhotoMutation();

  // Get health data from Redux state
  const { data: healthData, error: healthError } = useSelector((state: RootState) => state.health);

  // Queue for failed submissions
  const [queue, setQueue] = useState<Array<{ photoUri: string; formData: FormData; fileName: string }>>([]);
  const QUEUE_KEY = 'offline_queue_v1';

  useEffect(() => {
    if (healthError) {
      const msg = (healthError as any)?.message || 'Backend unreachable';
      console.warn('Backend health error:', msg);
    }
  }, [healthError]);

  // Queue management helpers
  const loadQueue = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) {
        const items = JSON.parse(raw);
        setQueue(items);
      }
    } catch (e) {
      console.error('Failed to load queue', e);
    }
  }, []);

  const saveQueue = useCallback(async (items: typeof queue) => {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save queue', e);
    }
  }, []);

  const enqueueSubmission = useCallback(async (photoUri: string, formData: FormData, fileName: string) => {
    const newItem = { photoUri, formData, fileName };
    const updated = [...queue, newItem];
    setQueue(updated);
    await saveQueue(updated);
    Alert.alert('Saved', 'Submission saved. Will retry when backend is available.');
  }, [queue, saveQueue]);

  const dequeueOne = useCallback(async () => {
    const [, ...rest] = queue;
    setQueue(rest);
    await saveQueue(rest);
    return queue[0];
  }, [queue, saveQueue]);

  // Process queue when backend becomes reachable
  const processQueue = useCallback(async () => {
    if (queue.length === 0 || !healthData || healthError) return;

    console.log(`Processing ${queue.length} queued submissions`);
    while (queue.length > 0) {
      const item = queue[0];
      try {
        await uploadPhoto(item.formData).unwrap();
        await dequeueOne();
        console.log('Queued submission uploaded successfully');
      } catch (err: any) {
        console.warn('Retry failed, will try later', err);
        break;
      }
    }
  }, [queue, uploadPhoto, dequeueOne, healthData, healthError]);

  // Load queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Process queue when backend becomes healthy
  useEffect(() => {
    if (healthData && !healthError && queue.length > 0) {
      processQueue();
    }
  }, [healthData, healthError, queue.length, processQueue]);

  // Helper to determine alert based on upload state
  const getUploadAlert = () => {
    if (uploadError) {
      const errorMsg = (uploadError as any)?.message || 'Unknown error';
      if (errorMsg.toLowerCase().includes('qr code already exists')) {
        return { title: '⚠️ QR Code Duplicate', message: 'This QR code has already been uploaded. Please try a different test strip.' };
      }
      return { title: 'Upload failed', message: errorMsg };
    }

    if (uploadData) {
      if (!uploadData.qrCodeValid) {
        return { title: '⚠️ No QR Code Detected', message: 'The uploaded image does not contain a valid QR code. Please try again with a clearer image.' };
      }
      if (uploadData.isExpired) {
        return { title: '⚠️ QR Code Expired', message: `This test strip has expired (${uploadData.expirationYear}). QR Code: ${uploadData.qrCode}` };
      }
      return { title: '✓ Upload Successful', message: `Valid QR Code detected: ${uploadData.qrCode}` };
    }

    return null;
  };

  useEffect(() => {
    const alert = getUploadAlert();
    if (alert) {
      Alert.alert(alert.title, alert.message);
      if (uploadData) {
        setPhotoUri(null);
      }
    }
  }, [uploadData, uploadError]);

  useEffect(() => {
    if (cameraOpen && !device) {
      setCameraOpen(false);
    }
  }, [cameraOpen, device]);

  const openCamera = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Camera permission required', 'Please grant camera access to take photos.');
        return;
      }
    }
    setCameraOpen(true);
  }, [hasPermission, requestPermission]);

  const takePhoto = useCallback(async () => {
    try {
      if (!cameraRef.current) return;
      const photo = await cameraRef.current.takeSnapshot({ quality: 80 });
      if (photo && photo.path) {
        setPhotoUri(`file://${photo.path}`);
      }
    } catch (err: any) {
      Alert.alert('Camera error', err?.message || 'Failed to take photo');
    } finally {
      setCameraOpen(false);
    }
  }, []);



  const submitPhoto = useCallback(async () => {
    if (!photoUri) return;

    try {
      const fileName = photoUri.split('/').pop() || 'photo.jpg';
      const match = /\.([a-z0-9]+)$/i.exec(fileName);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // Resize to max width 1200px (keep aspect ratio) and compress to ~80% JPEG
      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const compressedUri = manipulated.uri;
      const compressedName = `compressed-${fileName.replace(/\s+/g, '_')}`;

      const formData = new FormData();
      formData.append('image', {
        uri: compressedUri,
        name: compressedName,
        type: 'image/jpeg',
      } as any);

      try {
        await uploadPhoto(formData).unwrap();
      } catch (err: any) {
        // Check if error is due to connection/backend unavailability
        const errorMsg = (err as any)?.message || String(err);
        if (
          errorMsg.toLowerCase().includes('network') ||
          errorMsg.toLowerCase().includes('timeout') ||
          errorMsg.toLowerCase().includes('unreachable') ||
          !healthData ||
          healthError
        ) {
          // Backend unreachable - queue for retry
          await enqueueSubmission(photoUri, formData, compressedName);
          return;
        }
        // Other errors (validation, duplicate, etc) - rethrow
        throw err;
      }
    } catch (err: any) {
      Alert.alert('Compression error', err?.message || 'Failed to prepare image');
    }
  }, [photoUri, uploadPhoto, enqueueSubmission, healthData, healthError]);

  const isSubmitDisabled = uploadLoading || !photoUri;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>


      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Test Strip Scanner</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Ready to Scan</ThemedText>
        <ThemedText>
          Use the camera to capture test strip images and upload them for QR code analysis.
        </ThemedText>
        <View style={styles.cameraButtonRow}>
          <Button title="Open Camera" onPress={openCamera} />
        </View>
        <Modal visible={cameraOpen} animationType="slide">
          <View style={styles.modalContent}>
            {device ? (
              <Camera
                ref={cameraRef}
                style={styles.camera}
                device={device}
                isActive={isActive}
                photo={true}
              />
            ) : (
              <View style={styles.cameraFallback}>
                <Text style={styles.cameraFallbackText}>No camera device available</Text>
              </View>
            )}
            <View style={styles.captureOverlay}>
              <TouchableOpacity
                onPress={takePhoto}
                style={styles.shutterButton}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              <View style={styles.shutterSpacer} />
              <Button title="Cancel" onPress={() => setCameraOpen(false)} />
            </View>
          </View>
        </Modal>
        {photoUri ? (
          <View style={styles.photoContainer}>
            <ThemedText>Last photo:</ThemedText>
            <Image source={{ uri: photoUri }} style={styles.previewPhoto} />
            <View style={styles.submitRow}>
              <Button
                title={uploadLoading ? 'Uploading...' : 'Submit'}
                onPress={submitPhoto}
                disabled={isSubmitDisabled}
              />
            </View>
          </View>
        ) : null}
      </ThemedView>
    </ParallaxScrollView>)
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  previewPhoto: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  photoContainer: {
    marginTop: 12,
  },
  submitRow: {
    marginTop: 8,
  },
  cameraButtonRow: {
    marginTop: 8,
  },
  camera: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalContent: {
    flex: 1,
  },
  captureOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#b00020',
  },
  shutterSpacer: {
    height: 12,
  },
  cameraFallback: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFallbackText: {
    color: '#fff',
  },
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
