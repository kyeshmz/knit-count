import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

import { authClient } from "~/utils/auth";

export default function LoginScreen() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });

      router.replace("/");
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      await authClient.signIn.social({
        provider: "apple",
        callbackURL: "/",
      });

      router.replace("/");
    } catch (err) {
      console.error("Apple sign-in error:", err);
      setError("Failed to sign in with Apple. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-2 text-4xl font-bold text-gray-900">
          Knit Count
        </Text>
        <Text className="mb-12 text-center text-lg text-gray-600">
          Track your knitting projects with ease
        </Text>

        {/* Sign-in Buttons */}
        <View className="w-full gap-4">
          {/* Google Sign In */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading}
            className="flex-row items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-4 shadow-sm"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <View className="absolute left-4">
              <Text className="text-2xl">G</Text>
            </View>
            <Text className="text-base font-semibold text-gray-900">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Apple Sign In */}
          <TouchableOpacity
            onPress={handleAppleSignIn}
            disabled={loading}
            className="flex-row items-center justify-center rounded-xl bg-black px-6 py-4 shadow-sm"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <View className="absolute left-4">
              <Text className="text-2xl text-white"></Text>
            </View>
            <Text className="text-base font-semibold text-white">
              Continue with Apple
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View className="mt-6">
            <ActivityIndicator size="large" color="#000" />
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View className="mt-6 rounded-lg bg-red-50 px-4 py-3">
            <Text className="text-center text-sm text-red-800">{error}</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View className="pb-8">
        <Text className="text-center text-sm text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}
