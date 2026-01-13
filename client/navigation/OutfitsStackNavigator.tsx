import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OutfitsScreen from "@/screens/OutfitsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type OutfitsStackParamList = {
  Outfits: undefined;
};

const Stack = createNativeStackNavigator<OutfitsStackParamList>();

export default function OutfitsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Outfits"
        component={OutfitsScreen}
        options={{
          headerTitle: "Outfits",
        }}
      />
    </Stack.Navigator>
  );
}
