"use client";

import { type ReactNode, createContext, useState, useContext } from "react";
import { useStore } from "zustand";

import {
  createProjectStudioStore,
  ProjectStudioStore,
} from "@/stores/project-studio";

export type ProjectStudioStoreApi = ReturnType<typeof createProjectStudioStore>;

export const ProjectStudioStoreContext = createContext<
  ProjectStudioStoreApi | undefined
>(undefined);

export interface ProjectStudioStoreProviderProps {
  children: ReactNode;
}

export const ProjectStudioStoreProvider = ({
  children,
}: ProjectStudioStoreProviderProps) => {
  const [store] = useState(() => createProjectStudioStore());
  return (
    <ProjectStudioStoreContext.Provider value={store}>
      {children}
    </ProjectStudioStoreContext.Provider>
  );
};

export const useProjectStudioStore = <T,>(
  selector: (store: ProjectStudioStore) => T,
): T => {
  const projectStudioStoreContext = useContext(ProjectStudioStoreContext);
  if (!projectStudioStoreContext) {
    throw new Error(
      "useProjectStudioStore must be used within ProjectStudioStoreProvider",
    );
  }

  return useStore(projectStudioStoreContext, selector);
};

export const useProjectStudioStoreApi = (): ProjectStudioStoreApi => {
  const projectStudioStoreContext = useContext(ProjectStudioStoreContext);

  if (!projectStudioStoreContext) {
    throw new Error(
      "useProjectStudioStoreApi must be used within ProjectStudioStoreProvider",
    );
  }

  return projectStudioStoreContext;
};
