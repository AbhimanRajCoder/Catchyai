import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);

    useEffect(() => {
        // Logo Animation
        scale.value = withSequence(
            withTiming(1.2, { duration: 800 }),
            withSpring(1, { damping: 10 })
        );

        opacity.value = withTiming(1, { duration: 800 });

        // Text Animation
        textOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));

        // Finish after animation
        const timeout = setTimeout(() => {
            onFinish();
        }, 2500);

        return () => clearTimeout(timeout);
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: withTiming(textOpacity.value === 1 ? 0 : 20) }]
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000000', '#1a1a1a']}
                style={styles.background}
            />

            <Animated.View style={[styles.logoContainer, logoStyle]}>
                <LinearGradient
                    colors={['#4facfe', '#00f2fe']}
                    style={styles.iconCircle}
                >
                    <Ionicons name="shield-checkmark" size={60} color="#fff" />
                </LinearGradient>
            </Animated.View>

            <Animated.View style={[styles.textContainer, textStyle]}>
                <Text style={styles.title}>Catchy<Text style={styles.highlight}>AI</Text></Text>
                <Text style={styles.subtitle}>VERIFYING AUTHENTICITY</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    logoContainer: {
        marginBottom: 30,
        shadowColor: "#4facfe",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 1,
    },
    highlight: {
        color: '#4facfe',
    },
    subtitle: {
        color: '#666',
        fontSize: 14,
        marginTop: 10,
        letterSpacing: 4,
        fontWeight: '600',
    },
});
