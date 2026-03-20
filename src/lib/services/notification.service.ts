import prisma from '@/lib/prisma'
import { NotificationType } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  linkUrl?: string
  relatedTaskId?: string
  relatedSourceId?: string
}

/**
 * Create a new notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link_url: params.linkUrl,
        related_task_id: params.relatedTaskId,
        related_source_id: params.relatedSourceId,
        is_read: false,
      },
    })

    return notification
  } catch (error) {
    console.error('Create notification error:', error)
    throw error
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  try {
    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        user_id: userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link_url: params.linkUrl,
        related_task_id: params.relatedTaskId,
        related_source_id: params.relatedSourceId,
        is_read: false,
      })),
    })

    return notifications
  } catch (error) {
    console.error('Create notifications error:', error)
    throw error
  }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(userId: string, notificationIds?: string[]) {
  try {
    const where: any = {
      user_id: userId,
      is_read: false,
    }

    if (notificationIds) {
      where.id = { in: notificationIds }
    }

    const result = await prisma.notification.updateMany({
      where,
      data: {
        is_read: true,
      },
    })

    return result
  } catch (error) {
    console.error('Mark notifications read error:', error)
    throw error
  }
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string) {
  try {
    const count = await prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    })

    return count
  } catch (error) {
    console.error('Get unread count error:', error)
    throw error
  }
}
