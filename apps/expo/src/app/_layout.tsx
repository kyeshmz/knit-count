import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { LoadingScreen } from "~/components/LoadingScreen";
import { useDatabase } from "~/hooks/useDatabase";
import {
  queryClient,
  QueryClientProvider,
  trpcClient,
  TRPCProvider,
} from "~/utils/api";

import "../styles.css";

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isReady } = useDatabase();

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: "#c03484",
            },
            headerTintColor: "#FFFFFF",
            contentStyle: {
              backgroundColor: colorScheme === "dark" ? "#09090B" : "#FFFFFF",
            },
          }}
        />
        <StatusBar />
      </QueryClientProvider>
    </TRPCProvider>
  );
}
