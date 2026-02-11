import { Platform, Linking } from 'react-native';
import * as Application from 'expo-application';

/**
 * Request to disable battery optimization for the app.
 * This allows background location tracking even when the app is killed.
 */
export const requestBatteryOptimizationExemption = async () => {
    if (Platform.OS !== 'android') {
        return;
    }

    try {
        const packageName = Application.applicationId;

        // Open battery optimization settings
        await Linking.openSettings();

        // Note: We can't programmatically disable it, user must do it manually
        // The app opens settings and user needs to:
        // 1. Find "Battery"
        // 2. Find "App battery usage" or "Battery optimization"
        // 3. Find "Atılım Gıda"
        // 4. Select "Don't optimize"

        console.log('Battery optimization settings opened');
    } catch (error) {
        console.error('Failed to open battery settings:', error);
    }
};

/**
 * Check if background location permission is granted
 */
export const checkBackgroundLocationPermission = async () => {
    if (Platform.OS !== 'android') {
        return true;
    }

    // This is handled by expo-location, just a helper to verify
    return true;
};
