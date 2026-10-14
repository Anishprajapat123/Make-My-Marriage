import "server-only";
import mongoose, { Types } from "mongoose";
import { EventModel } from "./event.model";
export function eventFilter(tenantId: string, id: string) {
  return {
    tenantId: new Types.ObjectId(tenantId),
    _id: new Types.ObjectId(id),
  };
}
export const eventRepository = {
  list(tenantId: string) {
    return EventModel.find({ tenantId }).sort({ startAt: 1, _id: 1 }).lean();
  },
  get(tenantId: string, id: string) {
    return EventModel.findOne(eventFilter(tenantId, id)).lean();
  },
  create(tenantId: string, memberId: string, fields: object) {
    return EventModel.create({
      ...fields,
      tenantId,
      createdByMemberId: memberId,
    });
  },
  update(tenantId: string, id: string, updatedAt: string, fields: object) {
    return EventModel.findOneAndUpdate(
      { ...eventFilter(tenantId, id), updatedAt: new Date(updatedAt) },
      { $set: fields },
      { new: true, runValidators: true },
    ).lean();
  },
  saveTimeline(
    tenantId: string,
    id: string,
    updatedAt: string,
    item: { title: string; at: Date; note: string },
    itemId?: string,
  ) {
    const filter = {
      ...eventFilter(tenantId, id),
      updatedAt: new Date(updatedAt),
    };
    return (
      itemId
        ? EventModel.findOneAndUpdate(
            { ...filter, "timelineItems._id": new Types.ObjectId(itemId) },
            {
              $set: {
                "timelineItems.$.title": item.title,
                "timelineItems.$.at": item.at,
                "timelineItems.$.note": item.note,
              },
            },
            { new: true, runValidators: true },
          )
        : EventModel.findOneAndUpdate(
            { ...filter, "timelineItems.99": { $exists: false } },
            { $push: { timelineItems: item } },
            { new: true, runValidators: true },
          )
    ).lean();
  },
  removeTimeline(
    tenantId: string,
    id: string,
    itemId: string,
    updatedAt: string,
  ) {
    return EventModel.findOneAndUpdate(
      {
        ...eventFilter(tenantId, id),
        updatedAt: new Date(updatedAt),
        "timelineItems._id": new Types.ObjectId(itemId),
      },
      { $pull: { timelineItems: { _id: new Types.ObjectId(itemId) } } },
      { new: true },
    ).lean();
  },
  async deleteWithDependencies(tenant: string, id: string, updatedAt: string) {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        const tenantId = new Types.ObjectId(tenant),
          eventId = new Types.ObjectId(id);
        for (const collection of [
          "tasks",
          "expenses",
          "vendors",
          "gallery_albums",
          "livestreams",
          "issues",
          "reminders",
        ]) {
          const linked = await mongoose.connection
            .collection(collection)
            .findOne(
              {
                tenantId,
                $or: [
                  { eventId },
                  { eventIds: eventId },
                  { resourceType: "EVENT", resourceId: eventId },
                ],
              },
              { session, projection: { _id: 1 } },
            );
          if (linked) return "linked" as const;
        }
        const result = await EventModel.deleteOne(
          { ...eventFilter(tenant, id), updatedAt: new Date(updatedAt) },
          { session },
        );
        return result.deletedCount
          ? ("deleted" as const)
          : ("conflict" as const);
      });
    } finally {
      await session.endSession();
    }
  },
};
