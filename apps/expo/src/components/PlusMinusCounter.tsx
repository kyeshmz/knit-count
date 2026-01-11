import { Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";

interface PlusMinusCounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function PlusMinusCounter({
  value,
  onIncrement,
  onDecrement,
}: PlusMinusCounterProps) {
  const handlePress = async (action: () => void) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  return (
    <View className="flex-row items-center justify-center gap-4">
      <TouchableOpacity
        className="flex aspect-square w-32 items-center justify-center rounded-full bg-red-500 shadow-lg active:bg-red-600"
        onPress={() => handlePress(onDecrement)}
        activeOpacity={0.8}
      >
        <Ionicons name="remove" size={60} color="white" />
      </TouchableOpacity>

      <View className="flex min-w-[120px] items-center justify-center rounded-2xl bg-white px-8 py-4 shadow-lg">
        <Text className="text-5xl font-bold text-gray-900">{value}</Text>
      </View>

      <TouchableOpacity
        className="flex aspect-square w-32 items-center justify-center rounded-full bg-green-500 shadow-lg active:bg-green-600"
        onPress={() => handlePress(onIncrement)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={60} color="white" />
      </TouchableOpacity>
    </View>
  );
}
