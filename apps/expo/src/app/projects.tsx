import type { InferSelectModel } from "drizzle-orm";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router, Stack, useFocusEffect } from "expo-router";
import Entypo from "@expo/vector-icons/Entypo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { eq } from "drizzle-orm";

import { useDatabase } from "~/hooks/useDatabase";
import { projects } from "~/lib/drizzle/schema";

type Project = InferSelectModel<typeof projects>;

export default function Projects() {
  const { db, isReady } = useDatabase();
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [isCheckingActiveProject, setIsCheckingActiveProject] = useState(true);

  // Check for active project on mount
  useEffect(() => {
    const checkActiveProject = async () => {
      if (!db || !isReady) return;

      try {
        const activeProjectId = await AsyncStorage.getItem("activeProjectId");
        if (activeProjectId) {
          // Verify the project still exists
          const project = await db
            .select()
            .from(projects)
            .where(eq(projects.id, Number(activeProjectId)))
            .get();
          if (project && !project.isArchived) {
            router.replace(`/counter/${activeProjectId}`);
            return;
          } else {
            // Project no longer exists, clear the stored ID
            await AsyncStorage.removeItem("activeProjectId");
          }
        }
      } catch (error) {
        console.error("Error checking active project:", error);
      }
      setIsCheckingActiveProject(false);
    };
    void checkActiveProject();
  }, [db, isReady]);

  const loadProjects = useCallback(async () => {
    if (!db) return;

    const list = await db
      .select()
      .from(projects)
      .where(eq(projects.isArchived, false))
      .all();
    setProjectList(list);
  }, [db]);

  // Reload when screen comes into focus (also handles initial load)
  useFocusEffect(
    useCallback(() => {
      if (!isCheckingActiveProject && db) {
        void loadProjects();
      }
    }, [isCheckingActiveProject, loadProjects, db]),
  );

  const handleCreateProject = () => {
    router.push("/create-project");
  };

  // Show nothing while checking for active project or loading database
  if (isCheckingActiveProject || !isReady) {
    return null;
  }

  const handleProjectPress = (projectId: number) => {
    router.push(`/counter/${projectId}`);
  };

  const renderProject = ({ item }: { item: Project }) => (
    <TouchableOpacity
      className="mb-3 rounded-xl bg-white p-4 shadow-sm"
      onPress={() => handleProjectPress(item.id)}
    >
      <Text className="text-lg font-semibold text-gray-900">{item.name}</Text>
      <Text className="mt-1 text-sm text-gray-600">
        Size: {item.selectedSize}
      </Text>
      {item.description && (
        <Text className="mt-1 text-sm text-gray-500">{item.description}</Text>
      )}
      <Text className="mt-1 text-xs text-gray-400">
        Started: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView className="flex-1">
      <View className="flex-1 bg-gray-50">
        <Stack.Screen
          options={{
            title: "My Projects",
            headerRight: () => (
              <TouchableOpacity onPress={handleCreateProject}>
                <Entypo name="plus" size={24} color="white" />
              </TouchableOpacity>
            ),
          }}
        />

        <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-4">
          <Text className="text-3xl font-bold text-gray-900">My Projects</Text>
        </View>

        <FlatList
          data={projectList}
          renderItem={renderProject}
          keyExtractor={(item) => String(item.id)}
          className="flex-1 px-4 pt-4"
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="mb-2 text-lg font-medium text-gray-900">
                No Projects Yet
              </Text>
              <Text className="text-center text-sm text-gray-500">
                Create your first knitting project to get started
              </Text>
            </View>
          }
        />

        <View className="border-t border-gray-200 bg-white p-4">
          <TouchableOpacity
            className="rounded-xl bg-purple-600 py-4"
            onPress={handleCreateProject}
          >
            <Text className="text-center text-base font-semibold text-white">
              + Create New Project
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
