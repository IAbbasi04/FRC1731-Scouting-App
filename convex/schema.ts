import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scoutingEntries: defineTable({
    clientId: v.string(),
    schemaVersion: v.number(),
    season: v.number(),
    gameKey: v.string(),
    eventKey: v.string(),
    matchNumber: v.number(),
    teamNumber: v.number(),
    scoutName: v.string(),
    createdAt: v.string(),
    alliance: v.optional(v.union(v.literal("red"), v.literal("blue"))),
    autoStart: v.optional(v.object({ x: v.number(), y: v.number() })),
    gameData: v.any(),
    defense: v.union(v.literal("none"), v.literal("light"), v.literal("heavy")),
    driverRating: v.optional(v.number()),
    playedDefense: v.optional(v.boolean()),
    defenseRating: v.optional(v.number()),
    penalties: v.number(),
    disabled: v.boolean(),
    tipped: v.boolean(),
    mechanicalIssue: v.boolean(),
    notes: v.string(),
    source: v.union(v.literal("manual"), v.literal("ai-video")),
  })
    .index("by_season", ["season"])
    .index("by_event", ["eventKey"])
    .index("by_event_team", ["eventKey", "teamNumber"])
    .index("by_event_match", ["eventKey", "matchNumber"])
    .index("by_game_team", ["gameKey", "teamNumber"])
    .index("by_client_id", ["clientId"]),

  pitScoutingEntries: defineTable({
    clientId: v.string(),
    schemaVersion: v.number(),
    season: v.number(),
    eventKey: v.string(),
    teamNumber: v.number(),
    scoutName: v.string(),
    createdAt: v.string(),
    drivetrain: v.string(),
    widthIn: v.optional(v.number()),
    lengthIn: v.optional(v.number()),
    heightIn: v.optional(v.number()),
    weightLbs: v.optional(v.number()),
    usesTrench: v.boolean(),
    crossesBump: v.boolean(),
    floorIntake: v.boolean(),
    canPassFuel: v.boolean(),
    shootsOnMove: v.boolean(),
    shootingRange: v.string(),
    fuelCapacity: v.optional(v.number()),
    maxTowerLevel: v.string(),
    autoCount: v.number(),
    autoNotes: v.string(),
    preferredRole: v.string(),
    intakeNotes: v.string(),
    reliabilityNotes: v.string(),
    notes: v.string(),
  })
    .index("by_event", ["eventKey"])
    .index("by_event_team", ["eventKey", "teamNumber"])
    .index("by_client_id", ["clientId"]),
});
