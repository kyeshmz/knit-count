import { ActivityIndicator, Text, View } from "react-native";

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <ActivityIndicator size="large" color="#8B5CF6" />
      <Text className="mt-4 text-base text-gray-600">Loading...</Text>
    </View>
  );
}
