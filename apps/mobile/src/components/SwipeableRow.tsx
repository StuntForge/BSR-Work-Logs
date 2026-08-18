import React, { useRef } from "react";
import { Animated, PanResponder } from "react-native";

// Built on core RN PanResponder/Animated rather than react-native-gesture-handler, which isn't
// installed and would need a native rebuild to add — this needs none, ships as a JS-only update.
export function SwipeableRow({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -80) {
          Animated.timing(translateX, { toValue: -500, duration: 180, useNativeDriver: true }).start(onDismiss);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
      {children}
    </Animated.View>
  );
}
