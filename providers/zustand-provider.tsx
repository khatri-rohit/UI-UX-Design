"use client";

import { type ReactNode, createContext, useState, useContext } from "react";
import { useStore } from "zustand";

import { createUserActivityStore, ProjectsStore } from "@/stores/user-activity";

export type UserActivityStore = ReturnType<typeof createUserActivityStore>;

export const ProjectsStoreContext = createContext<
  UserActivityStore | undefined
>(undefined);

export interface ProjectsStoreProviderProps {
  children: ReactNode;
}

export const UserActivityStoreProvider = ({
  children,
}: ProjectsStoreProviderProps) => {
  const [store] = useState(() => createUserActivityStore());
  return (
    <ProjectsStoreContext.Provider value={store}>
      {children}
    </ProjectsStoreContext.Provider>
  );
};

export const useUserActivityStore = <T,>(
  selector: (store: ProjectsStore) => T,
): T => {
  const projectsStoreContext = useContext(ProjectsStoreContext);
  if (!projectsStoreContext) {
    throw new Error(
      `useUserActivityStore must be used within UserActivityStoreProvider`,
    );
  }

  return useStore(projectsStoreContext, selector);
};
