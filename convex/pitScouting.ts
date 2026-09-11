import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const pitArgs = {
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
};

export const upsertEntry = mutationGeneric({
  args: pitArgs,
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pitScoutingEntries")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("pitScoutingEntries", args);
  },
});

export const listEventEntries = queryGeneric({
  args: { eventKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pitScoutingEntries")
      .withIndex("by_event", (q) => q.eq("eventKey", args.eventKey.toLowerCase()))
      .collect();
  },
});

export const listTeamEntries = queryGeneric({
  args: { eventKey: v.string(), teamNumber: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pitScoutingEntries")
      .withIndex("by_event_team", (q) => q.eq("eventKey", args.eventKey.toLowerCase()).eq("teamNumber", args.teamNumber))
      .collect();
  },
});
