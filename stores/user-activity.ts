import { createStore } from "zustand";

export type Timeframe = "Recent" | "Yesterday" | "Last 7 Days" | "Last 30 Days";
export type Spec = "web" | "mobile";

export interface UserActivityState {
  selectedTimeframe: Timeframe;
  spec: Spec;
}

export interface UserActivityActions {
  setSelectedTimeframe: (timeframe: Timeframe) => void;
  setSpec: (spec: Spec) => void;
}

export type ProjectsStore = UserActivityState & UserActivityActions;

const defaultState: UserActivityState = {
  selectedTimeframe: "Recent",
  spec: "web",
};

export const createUserActivityStore = (
  initState: Partial<UserActivityState> = {},
) =>
  createStore<ProjectsStore>()((set) => ({
    ...defaultState,
    ...initState,
    setSelectedTimeframe: (selectedTimeframe) => set({ selectedTimeframe }),
    setSpec: (spec) => set({ spec }),
  }));
