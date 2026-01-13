import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import ItemDetailScreen from "@/screens/ItemDetailScreen";
import AddEditItemScreen from "@/screens/AddEditItemScreen";
import OutfitBuilderScreen from "@/screens/OutfitBuilderScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  ItemDetail: { itemId: string };
  AddEditItem: { itemId?: string };
  OutfitBuilder: { outfitId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{
          presentation: "modal",
          headerTitle: "Item Details",
        }}
      />
      <Stack.Screen
        name="AddEditItem"
        component={AddEditItemScreen}
        options={{
          presentation: "modal",
          headerTitle: "Add Item",
        }}
      />
      <Stack.Screen
        name="OutfitBuilder"
        component={OutfitBuilderScreen}
        options={{
          presentation: "modal",
          headerTitle: "Create Outfit",
        }}
      />
    </Stack.Navigator>
  );
}
