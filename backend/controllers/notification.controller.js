import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as notificationRepo from "../repositories/notification.repo.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationRepo.listNotifications(req.user._id);
  const unreadCount = await notificationRepo.countUnreadNotifications(req.user._id);
  sendSuccess(res, { data: { notifications, unreadCount } });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await notificationRepo.markNotificationRead(req.user._id, req.params.id);
  sendSuccess(res, { message: "Notification marked as read" });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await notificationRepo.markAllNotificationsRead(req.user._id);
  sendSuccess(res, { message: "Notifications marked as read" });
});
