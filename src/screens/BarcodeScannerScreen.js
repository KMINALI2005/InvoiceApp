import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useScanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/colors';

const BarcodeScannerScreen = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const devices = useCameraDevices();
  const device = devices.back;

  const [frameProcessor, barcodes] = useScanBarcodes([BarcodeFormat.ALL_FORMATS], {
    checkInverted: true,
  });

  const { onScan } = route.params || {};

  useEffect(() => {
    checkCameraPermission();
  }, []);

  useEffect(() => {
    if (barcodes && barcodes.length > 0 && isActive) {
      handleBarcodeScan(barcodes[0]);
    }
  }, [barcodes]);

  const checkCameraPermission = async () => {
    const status = await Camera.getCameraPermissionStatus();
    
    if (status === 'authorized') {
      setHasPermission(true);
    } else if (status === 'not-determined') {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'authorized');
    } else {
      Alert.alert(
        'إذن الكاميرا مطلوب',
        'يرجى منح التطبيق إذن الوصول للكاميرا من الإعدادات',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'فتح الإعدادات', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const handleBarcodeScan = (barcode) => {
    setIsActive(false);
    
    if (onScan) {
      onScan(barcode.displayValue || barcode.content?.data);
    }
    
    setTimeout(() => {
      navigation.goBack();
    }, 100);
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          يرجى منح إذن الوصول للكاميرا
        </Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          جاري تحميل الكاميرا...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        frameProcessor={frameProcessor}
        frameProcessorFps={5}
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>مسح الباركود</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instructionText}>
            وجّه الكاميرا نحو الباركود
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    marginTop: 40,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
});

export default BarcodeScannerScreen;
