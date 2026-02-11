import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ReportsScreen from '../screens/ReportsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NewReportScreen from '../screens/NewReportScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import NewChatScreen from '../screens/NewChatScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import ChatInfoScreen from '../screens/ChatInfoScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size, focused }) => {
                    let iconName;

                    if (route.name === 'Ana Sayfa') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Raporlar') {
                        iconName = focused ? 'document-text' : 'document-text-outline';
                    } else if (route.name === 'Sipariş') {
                        iconName = focused ? 'cart' : 'cart-outline';
                    } else if (route.name === 'Profil') {
                        iconName = focused ? 'person' : 'person-outline';
                    } else if (route.name === 'Mesajlar') {
                        iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen name="Ana Sayfa" component={DashboardScreen} />
            <Tab.Screen name="Raporlar" component={ReportsScreen} />
            <Tab.Screen name="Sipariş" component={OrdersScreen} />
            <Tab.Screen name="Mesajlar" component={ChatListScreen} />
            <Tab.Screen name="Profil" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    <>
                        <Stack.Screen name="Main" component={MainTabs} />
                        <Stack.Screen name="NewReport" component={NewReportScreen} />
                        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
                        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
                        <Stack.Screen name="NewChat" component={NewChatScreen} options={{ presentation: 'modal' }} />
                        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
                        <Stack.Screen name="ChatInfo" component={ChatInfoScreen} />
                        <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
                    </>
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
