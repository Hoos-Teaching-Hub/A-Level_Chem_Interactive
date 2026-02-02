import { makeActivityId } from "./ids.ts";

type ProgressSample = {
  activity_id: string;
  state: { progress: number; topic: string };
  updated_at: string;
};

/**
 * Deterministic progress sample data to keep teacher-report aggregation tests
 * stable and easy to reason about (no random values).
 */
export function buildProgressSamples(): ProgressSample[] {
  return [
    {
      activity_id: makeActivityId(),
      state: { progress: 0.2, topic: "Equilibria" },
      updated_at: "2024-01-02T00:00:00.000Z",
    },
    {
      activity_id: makeActivityId(),
      state: { progress: 0.8, topic: "Kinetics" },
      updated_at: "2024-01-03T00:00:00.000Z",
    },
    {
      activity_id: makeActivityId(),
      state: { progress: 0.6, topic: "Equilibria" },
      updated_at: "2024-01-04T00:00:00.000Z",
    },
    {
      activity_id: makeActivityId(),
      state: { progress: 0.4, topic: "Kinetics" },
      updated_at: "2024-01-05T00:00:00.000Z",
    },
  ];
}
