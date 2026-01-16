import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WardrobeScreen from "@/screens/WardrobeScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type WardrobeStackParamList = {
  Wardrobe: undefined;
};

const Stack = createNativeStackNavigator<WardrobeStackParamList>();

export default function WardrobeStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={{
          headerTitle: "Wardrobe",
        }}
      />
    </Stack.Navigator>
  );
}
