import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scoutingEntries: defineTable({
    clientId: v.string(),
    schemaVersion: v.number(),
    eventKey: v.string(),
    matchNumber: v.number(),
    teamNumber: v.number(),
    scoutName: v.string(),
    createdAt: v.string(),
    auto: v.object({
      attempts: v.number(),
      scored: v.number(),
    }),
    teleop: v.object({
      attempts: v.number(),
      scored: v.number(),
      averageCycleSeconds: v.union(v.number(), v.null()),
    }),
    endgame: v.union(v.literal("none"), v.literal("attempted"), v.literal("successful")),
    defense: v.union(v.literal("none"), v.literal("light"), v.literal("heavy")),
    penalties: v.number(),
    disabled: v.boolean(),
    tipped: v.boolean(),
    mechanicalIssue: v.boolean(),
    notes: v.string(),
  })
    .index("by_event", ["eventKey"])
    .index("by_event_team", ["eventKey", "teamNumber"])
    .index("by_event_match", ["eventKey", "matchNumber"])
    .index("by_client_id", ["clientId"]),
});
