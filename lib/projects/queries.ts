import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ApiError, requestApi } from "@/lib/api/http";

export type ProjectSummary = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
};

type CreateProjectInput = {
  prompt: string;
};

type CreateProjectResult = {
  projectId: string;
  title: string;
  description: string | null;
  spec: "web" | "mobile";
  updatedAt: string;
};

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: () => [...projectKeys.lists(), "all"] as const,
};

async function listProjects() {
  return requestApi<ProjectSummary[]>("/api/projects/all");
}

async function createProject({ prompt }: CreateProjectInput) {
  const normalizedPrompt = prompt.trim();

  if (!normalizedPrompt) {
    throw new ApiError("Prompt is required.", 400, "INVALID_PROMPT");
  }

  return requestApi<CreateProjectResult>("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: normalizedPrompt }),
  });
}

export function projectsListQueryOptions() {
  return queryOptions({
    queryKey: projectKeys.list(),
    queryFn: listProjects,
    refetchOnWindowFocus: false,
  });
}

export function useProjectsQuery() {
  return useQuery(projectsListQueryOptions());
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: async (createdProject) => {
      queryClient.setQueryData<ProjectSummary[]>(
        projectKeys.list(),
        (currentProjects) => {
          if (!currentProjects) {
            return currentProjects;
          }

          if (
            currentProjects.some(
              (project) => project.id === createdProject.projectId,
            )
          ) {
            return currentProjects;
          }

          return [
            {
              id: createdProject.projectId,
              title: createdProject.title,
              description: createdProject.description,
              thumbnailUrl: null,
              updatedAt: createdProject.updatedAt,
            },
            ...currentProjects,
          ];
        },
      );

      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
