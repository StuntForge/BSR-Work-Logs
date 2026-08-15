import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { BadgeProvider, useBadges } from "./BadgeContext";
import { colors } from "../theme";
import { IconHome, IconBriefcase, IconClipboardCheck, IconBell } from "../components/Icons";

import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import WorkListScreen from "../screens/WorkListScreen";
import NewProductionScreen from "../screens/NewProductionScreen";
import ProductionDetailScreen from "../screens/ProductionDetailScreen";
import WorkApprovalsScreen from "../screens/WorkApprovalsScreen";
import ReviewScreen from "../screens/ReviewScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { user } = useAuth();
  const { unreadNotifications, pendingApprovals } = useBadges();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
        tabBarStyle: {
          backgroundColor: colors.tealDarkest,
          borderTopWidth: 0,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color, size }) => <IconHome color={color} size={size} /> }} />
      <Tab.Screen name="Work" component={WorkListScreen} options={{ tabBarIcon: ({ color, size }) => <IconBriefcase color={color} size={size} /> }} />
      {user?.isFullMember && (
        <Tab.Screen
          name="Approvals"
          component={WorkApprovalsScreen}
          options={{
            tabBarBadge: pendingApprovals > 0 ? pendingApprovals : undefined,
            tabBarIcon: ({ color, size }) => <IconClipboardCheck color={color} size={size} />,
          }}
        />
      )}
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
          tabBarIcon: ({ color, size }) => <IconBell color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <LoginScreen />
      ) : (
        <BadgeProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="NewProduction" component={NewProductionScreen} />
            <Stack.Screen name="ProductionDetail" component={ProductionDetailScreen} />
            <Stack.Screen name="Review" component={ReviewScreen} />
          </Stack.Navigator>
        </BadgeProvider>
      )}
    </NavigationContainer>
  );
}
