import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StatusBar } from 'react-native';

import SearchScreen from './src/screens/SearchScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import AlertsScreen from './src/screens/AlertsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: '#0A0E27',
  },
  headerTintColor: '#F9FAFB',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
  contentStyle: {
    backgroundColor: '#0A0E27',
  },
};

function TabIcon({ label, focused }) {
  const icons = {
    Busca: '🔍',
    Alertas: '🔔',
  };
  return (
    <View className="items-center justify-center">
      <Text style={{ fontSize: focused ? 22 : 20 }}>{icons[label] || '•'}</Text>
    </View>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="SearchHome"
        component={SearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#3B82F6',
            background: '#0A0E27',
            card: '#111827',
            text: '#F9FAFB',
            border: '#1F2937',
            notification: '#EF4444',
          },
        }}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#111827',
              borderTopColor: '#1F2937',
              borderTopWidth: 1,
              height: 65,
              paddingBottom: 10,
              paddingTop: 8,
            },
            tabBarActiveTintColor: '#3B82F6',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
            tabBarIcon: ({ focused }) => (
              <TabIcon label={route.name} focused={focused} />
            ),
          })}
        >
          <Tab.Screen name="Busca" component={SearchStack} />
          <Tab.Screen name="Alertas" component={AlertsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
