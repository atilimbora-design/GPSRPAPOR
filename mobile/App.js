import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export default function App() {
  useEffect(() => {
    // Otomatik güncelleme kontrolü
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Güncelleme Hazır',
            'Yeni sürüm indirildi. Uygulama yeniden başlatılacak.',
            [
              {
                text: 'Şimdi Yenile',
                onPress: async () => {
                  await Updates.reloadAsync();
                }
              }
            ]
          );
        }
      } catch (error) {
        console.log('Güncelleme kontrolü başarısız:', error);
      }
    }

    // Uygulama başladığında güncelleme kontrol et
    checkForUpdates();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
