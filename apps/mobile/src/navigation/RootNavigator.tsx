import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, TouchableOpacity, ActivityIndicator, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { BadgeProvider, useBadges } from "./BadgeContext";
import { colors } from "../theme";

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

function LogoutHeaderButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity onPress={logout} style={{ marginRight: 12 }}>
      <Text style={{ color: colors.greenDark, fontWeight: "600" }}>Sign out</Text>
    </TouchableOpacity>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const { unreadNotifications, pendingApprovals } = useBadges();

  return (
    <Tab.Navigator
      screenOptions={{
        headerRight: () => <LogoutHeaderButton />,
        tabBarActiveTintColor: colors.greenDark,
        headerStyle: { backgroundColor: colors.cream },
        headerTitleStyle: { color: colors.greenDark },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Work" component={WorkListScreen} />
      {user?.isFullMember && (
        <Tab.Screen
          name="Approvals"
          component={WorkApprovalsScreen}
          options={{ tabBarBadge: pendingApprovals > 0 ? pendingApprovals : undefined }}
        />
      )}
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream }}>
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
          <Stack.Navigator>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="NewProduction" component={NewProductionScreen} options={{ title: "New production" }} />
            <Stack.Screen name="ProductionDetail" component={ProductionDetailScreen} options={{ title: "Production" }} />
            <Stack.Screen name="Review" component={ReviewScreen} options={{ title: "Review" }} />
          </Stack.Navigator>
        </BadgeProvider>
      )}
    </NavigationContainer>
  );
}
