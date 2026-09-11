import { queryGeneric } from "convex/server";
import { v } from "convex/values";

export const listEventEntries = queryGeneric({
  args: { eventKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scoutingEntries")
      .withIndex("by_event", (q) => q.eq("eventKey", args.eventKey.toLowerCase()))
      .collect();
  },
});
