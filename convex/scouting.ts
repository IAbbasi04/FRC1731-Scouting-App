import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

const scoutingArgs = {
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
};

export const upsertEntry = mutationGeneric({
  args: scoutingArgs,
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scoutingEntries")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("scoutingEntries", args);
  },
});
