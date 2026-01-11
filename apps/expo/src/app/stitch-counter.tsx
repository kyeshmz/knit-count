import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function StitchCounter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount((c) => c + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const decrement = () => {
    setCount((c) => Math.max(0, c - 1));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const reset = () => {
    setCount(0);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View className="flex-1 items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <View className="items-center">
        <Text className="mb-2 text-xl font-medium text-gray-600">
          Stitch Count
        </Text>
        <View className="mb-8 min-w-[200px] rounded-3xl bg-white px-8 py-6 shadow-lg">
          <Text className="text-center text-7xl font-bold text-indigo-600">
            {count}
          </Text>
        </View>

        <View className="w-full max-w-md space-y-4">
          <TouchableOpacity
            className="rounded-2xl bg-indigo-600 px-12 py-6 shadow-md active:scale-98 active:bg-indigo-700"
            onPress={increment}
          >
            <Text className="text-center text-2xl font-bold text-white">
              + Add Stitch
            </Text>
          </TouchableOpacity>

          <View className="flex-row space-x-4">
            <TouchableOpacity
              className="flex-1 rounded-2xl border-2 border-gray-300 bg-white px-6 py-4 active:scale-98 active:bg-gray-50"
              onPress={decrement}
            >
              <Text className="text-center text-lg font-semibold text-gray-700">
                - Remove
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 rounded-2xl border-2 border-red-300 bg-white px-6 py-4 active:scale-98 active:bg-red-50"
              onPress={reset}
            >
              <Text className="text-center text-lg font-semibold text-red-600">
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
