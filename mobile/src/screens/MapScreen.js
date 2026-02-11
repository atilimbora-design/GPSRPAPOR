import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
    return (
        <SafeAreaView>
            <Text style={{ fontSize: 20, textAlign: 'center', marginTop: 20 }}>Harita</Text>
        </SafeAreaView>
    );
}
