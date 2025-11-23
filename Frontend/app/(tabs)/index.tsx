import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../src/config';
// import { API_URL } from '../../src/config'; // Uncomment this in your real app


const { width } = Dimensions.get('window');

// --- UPDATED TYPES TO MATCH JSON ---
interface DeepfakeModel {
  name: string;
  status: string;
  score: number | null;
  finalScore: number | null; // Added based on your JSON
  normalizedScore: number | null;
}

interface AnalysisResult {
  requestId: string;
  overallStatus: string;
  resultsSummary: {
    status: string;
    metadata: {
      finalScore?: number;
    }
  };
  deepfakeModels: DeepfakeModel[];
}

interface ErrorState {
  visible: boolean;
  title: string;
  message: string;
  code?: string;
}

// --- COMPONENTS ---

const ErrorBanner = ({ error, onDismiss }: { error: ErrorState; onDismiss: () => void }) => {
  if (!error.visible) return null;

  return (
    <Animated.View
      entering={SlideInDown.springify()}
      exiting={SlideOutDown}
      style={styles.errorBanner}
    >
      <View style={styles.errorContent}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle" size={32} color="#ff4444" />
        </View>
        <View style={styles.errorTextContainer}>
          <Text style={styles.errorTitle}>{error.title}</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          {error.code && <Text style={styles.errorCode}>Code: {error.code}</Text>}
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.errorClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const ScanLine = () => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(280, { duration: 2000, easing: Easing.linear }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.scanLine, animatedStyle]}>
      <LinearGradient
        colors={['rgba(79, 172, 254, 0)', '#4facfe', 'rgba(79, 172, 254, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.scanGradient}
      />
    </Animated.View>
  );
};

const HomeScreen: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<ErrorState>({ visible: false, title: '', message: '' });

  const showError = (title: string, message: string, code?: string) => {
    Vibration.vibrate();
    setError({ visible: true, title, message, code });
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showError("Permission Denied", "We need access to your photos to verify them.", "PERM_01");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setResults(null);
        setError({ ...error, visible: false });
      }
    } catch (e) {
      showError("Gallery Error", "Could not open image gallery.", "GAL_01");
    }
  };

  const handleVerify = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setResults(null);
    setError({ ...error, visible: false });

    try {
      setStatusMessage('Initializing secure upload...');

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const res = await fetch(selectedImage.uri);
        const blob = await res.blob();
        formData.append('file', blob, 'upload.jpg');
      } else {
        formData.append('file', {
          uri: selectedImage.uri,
          name: 'upload.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error(`Server responded with ${uploadRes.status}`);
      const { requestId } = await uploadRes.json();
      if (!requestId) throw new Error("No Request ID received");

      setStatusMessage('Analyzing image patterns...');
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await fetch(`${API_URL}/result/${requestId}`);

        if (pollRes.ok) {
          const data = await pollRes.json();
          // Check specifically for final statuses
          if (['COMPLETED', 'DONE', 'FAKE', 'AUTHENTIC', 'MANIPULATED'].includes(data.overallStatus)) {
            setResults(data);
            setLoading(false);
            return;
          }
          if (data.overallStatus === 'FAILED') throw new Error("Analysis failed on server");
        }
        attempts++;
      }
      throw new Error("Analysis timed out");

    } catch (e: any) {
      setLoading(false);
      showError("Verification Failed", e.message || "Unable to verify image.", "NET_ERR");
    }
  };

  // Logic: Higher score = Higher chance of being Fake
  const getScoreColor = (score: number) => {
    if (score > 70) return '#ff4444'; // High probability of fake
    if (score > 40) return '#ffbb33'; // Suspicious
    return '#00c851'; // Low probability (Authentic)
  };

  const getVerdictUI = () => {
    if (!results) return null;
    const isFake = ['FAKE', 'MANIPULATED'].includes(results.overallStatus);
    const isAuthentic = results.overallStatus === 'AUTHENTIC';

    const color = isFake ? '#ff4444' : (isAuthentic ? '#00c851' : '#4facfe');
    const icon = isFake ? 'warning' : (isAuthentic ? 'checkmark-circle' : 'help-circle');
    const text = isFake ? 'MANIPULATION DETECTED' : (isAuthentic ? 'AUTHENTIC MEDIA' : results.overallStatus);

    return { color, icon, text };
  };

  const verdict = getVerdictUI();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>SYSTEM ONLINE</Text>
          </View>
          <Text style={styles.headerTitle}>CATCHY<Text style={{ color: '#4facfe' }}> AI</Text></Text>
        </View>

        {/* Main Interface */}
        <View style={styles.card}>
          {selectedImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              {loading && <ScanLine />}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  setSelectedImage(null);
                  setResults(null);
                }}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadZone}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(79, 172, 254, 0.1)', 'rgba(0, 242, 254, 0.05)']}
                style={styles.uploadGradient}
              >
                <Ionicons name="aperture" size={64} color="#4facfe" />
                <Text style={styles.uploadTitle}>TAP TO SCAN</Text>
                <Text style={styles.uploadSubtitle}>Upload image for verification</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Controls */}
          <View style={styles.controls}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#4facfe" size="large" />
                <Text style={styles.loadingText}>{statusMessage}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.verifyBtn, !selectedImage && styles.disabledBtn]}
                onPress={handleVerify}
                disabled={!selectedImage}
              >
                <LinearGradient
                  colors={selectedImage ? ['#4facfe', '#00f2fe'] : ['#333', '#333']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  <Text style={styles.btnText}>INITIATE SCAN</Text>
                  <Ionicons name="arrow-forward" size={20} color={selectedImage ? "#000" : "#666"} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* RESULTS SECTION - Corrected Logic */}
        {results && verdict && (
          <Animated.View entering={FadeIn} style={[styles.resultsContainer, { borderColor: verdict.color }]}>

            {/* 1. Main Verdict Header */}
            <View style={styles.verdictHeader}>
              <Ionicons name={verdict.icon as any} size={40} color={verdict.color} />
              <Text style={[styles.verdictTitle, { color: verdict.color }]}>
                {verdict.text}
              </Text>
              {results.resultsSummary.metadata.finalScore !== undefined && (
                <Text style={styles.overallScoreText}>
                  Aggregate Anomaly Score: {results.resultsSummary.metadata.finalScore}%
                </Text>
              )}
            </View>

            <View style={styles.divider} />
            <Text style={styles.subHeader}>DETAILED ANALYSIS</Text>

            {/* 2. Detailed Model Scores */}
            {results.deepfakeModels.map((model, idx) => {
              // Use finalScore (0-100) if available, otherwise calculate from score (0-1)
              const displayScore = model.finalScore ?? (model.score ? Math.round(model.score * 100) : 0);

              return (
                <View key={idx} style={styles.modelRow}>
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelName}>{model.name}</Text>
                    <Text style={styles.modelStatus}>{model.status}</Text>
                  </View>

                  <View style={styles.scoreWrapper}>
                    <View style={styles.scoreTrack}>
                      <View
                        style={[
                          styles.scoreFill,
                          {
                            width: `${displayScore}%`,
                            backgroundColor: getScoreColor(displayScore)
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.scoreValue, { color: getScoreColor(displayScore) }]}>
                      {displayScore}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

      </ScrollView>

      <ErrorBanner error={error} onDismiss={() => setError({ ...error, visible: false })} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (Keep your existing styles, and ADD/UPDATE the following for the results) ...
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 81, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 81, 0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00c851',
    marginRight: 8,
  },
  statusText: {
    color: '#00c851',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#121212',
    borderRadius: 24,
    padding: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 24,
  },
  uploadZone: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
  },
  uploadGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 20,
  },
  uploadTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    letterSpacing: 2,
  },
  uploadSubtitle: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
  },
  previewContainer: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 10,
  },
  scanGradient: {
    flex: 1,
    height: 2,
    shadowColor: "#4facfe",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  controls: {
    padding: 14,
  },
  verifyBtn: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  btnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 10,
  },
  loadingText: {
    color: '#4facfe',
    marginTop: 10,
    fontSize: 12,
    letterSpacing: 1,
  },
  // UPDATED RESULT STYLES
  resultsContainer: {
    backgroundColor: '#121212',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    marginBottom: 30,
  },
  verdictHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  verdictTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 1,
    textAlign: 'center',
  },
  overallScoreText: {
    color: '#888',
    fontSize: 14,
    marginTop: 5,
  },
  subHeader: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 15,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 15,
  },
  modelRow: {
    marginBottom: 18,
  },
  modelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modelName: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  modelStatus: {
    color: '#666',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  scoreWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'right',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  errorContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  errorIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorMessage: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
  errorCode: {
    color: '#666',
    fontSize: 10,
    marginTop: 6,
  },
  errorClose: {
    padding: 4,
  },
});

export default HomeScreen;