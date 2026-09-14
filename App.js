import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

export default function App() {
  const [started, setStarted] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const startCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        return;
      }
    }

    setStarted(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.container}>

        {!started ? (
          <View style={styles.center}>

            <View style={styles.logoCircle}>
              <Text style={styles.logoK}>K</Text>
            </View>

            <Text style={styles.title}>Kelvin Live</Text>

            <Text style={styles.subtitle}>
              Real-time avatar video technology
            </Text>

            <Pressable
              onPress={startCamera}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Start Camera</Text>
              <Text style={styles.arrow}>→</Text>
            </Pressable>

          </View>
        ) : (
          <View style={styles.cameraScreen}>

            <View style={styles.cameraHeader}>
              <View>
                <Text style={styles.cameraTitle}>Kelvin Live</Text>
                <Text style={styles.cameraSubtitle}>
                  Camera Preview
                </Text>
              </View>

              <View style={styles.liveBadge}>
                <View style={styles.dot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.cameraFrame}>
              <CameraView
                style={styles.camera}
                facing="front"
              />

              <View style={styles.cameraOverlay}>
                <Text style={styles.overlayText}>
                  Your camera is live
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setStarted(false)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Stop Camera</Text>
            </Pressable>

          </View>
        )}

        {!started && (
          <Text style={styles.footer}>
            Kelvin Live • Camera Test
          </Text>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  logoCircle: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  logoK: {
    color: '#fff',
    fontSize: 54,
    fontWeight: '800',
  },

  title: {
    color: '#111827',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 12,
    color: '#667085',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    maxWidth: 310,
  },

  button: {
    marginTop: 34,
    minWidth: 220,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  arrow: {
    color: '#fff',
    fontSize: 23,
    marginLeft: 10,
  },

  cameraScreen: {
    flex: 1,
    width: '100%',
  },

  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  cameraTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },

  cameraSubtitle: {
    color: '#667085',
    fontSize: 14,
    marginTop: 3,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f2f4f7',
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#111827',
    marginRight: 7,
  },

  liveText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },

  cameraFrame: {
    flex: 1,
    width: '100%',
    maxHeight: 620,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },

  camera: {
    flex: 1,
    width: '100%',
  },

  cameraOverlay: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
    alignItems: 'center',
  },

  overlayText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
  },

  secondaryButton: {
    marginTop: 18,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },

  secondaryText: {
    color: '#111827',
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    color: '#98a2b3',
    fontSize: 12,
  },

});
