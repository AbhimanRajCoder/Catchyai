import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const [isDarkMode, setIsDarkMode] = React.useState(true);
    const [notifications, setNotifications] = React.useState(true);

    const renderSettingItem = (icon: any, title: string, type: 'toggle' | 'link', value?: boolean, onToggle?: (val: boolean) => void) => (
        <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={20} color="#fff" />
                </View>
                <Text style={styles.settingTitle}>{title}</Text>
            </View>

            {type === 'toggle' ? (
                <Switch
                    value={value}
                    onValueChange={onToggle}
                    trackColor={{ false: "#333", true: "#4facfe" }}
                    thumbColor={value ? "#fff" : "#f4f3f4"}
                />
            ) : (
                <Ionicons name="chevron-forward" size={20} color="#666" />
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* User Card */}
                <View style={styles.userCard}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={40} color="#4facfe" />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>Demo User</Text>
                        <Text style={styles.userEmail}>user@example.com</Text>
                    </View>
                </View>

                {/* Settings Section */}
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.section}>
                    {renderSettingItem("moon", "Dark Mode", "toggle", isDarkMode, setIsDarkMode)}
                    {renderSettingItem("notifications", "Notifications", "toggle", notifications, setNotifications)}
                </View>

                {/* Support Section */}
                <Text style={styles.sectionTitle}>Support</Text>
                <View style={styles.section}>
                    <TouchableOpacity>
                        {renderSettingItem("help-circle", "Help Center", "link")}
                    </TouchableOpacity>
                    <TouchableOpacity>
                        {renderSettingItem("information-circle", "About", "link")}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        padding: 20,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        padding: 20,
        borderRadius: 16,
        marginBottom: 30,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(79, 172, 254, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    userEmail: {
        color: '#888',
        fontSize: 14,
    },
    sectionTitle: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        marginLeft: 5,
        textTransform: 'uppercase',
    },
    section: {
        backgroundColor: '#1e1e1e',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 25,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingTitle: {
        color: '#fff',
        fontSize: 16,
    },
    logoutBtn: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    logoutText: {
        color: '#ff4444',
        fontSize: 16,
        fontWeight: '600',
    },
    versionText: {
        color: '#444',
        textAlign: 'center',
        marginTop: 30,
        fontSize: 12,
    },
});
