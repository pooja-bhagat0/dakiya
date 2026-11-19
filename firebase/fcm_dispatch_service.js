import admin from 'firebase-admin'
import dotenv from 'dotenv'

dotenv.config()

/**
 * DaakExpress / Dakiya FCM Notification Dispatch Service
 * Sends push notifications to Agents on new delivery orders,
 * and to Senders on order acceptance, pickup, and delivery confirmation.
 */

// Initialize Firebase Admin (Uses service account or default credentials)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'dakiya-650a3',
    })
    console.log('[FCM] Firebase Admin SDK initialized successfully.')
  } catch (error) {
    console.warn('[FCM] Firebase initialization note:', error.message)
  }
}

/**
 * 1. Dispatch New Order Alert to Nearest Delivery Agent
 * Triggers high-priority audible notification with 2-3 minute acceptance countdown.
 */
export async function sendNewOrderNotificationToAgent(agentFcmToken, orderDetails) {
  const message = {
    token: agentFcmToken,
    notification: {
      title: '📦 New Delivery Request Nearby!',
      body: `Pickup: ${orderDetails.pickupArea} → Drop: ${orderDetails.dropArea} (Earn ₹${orderDetails.agentEarnings})`,
    },
    data: {
      type: 'NEW_ORDER_DISPATCH',
      orderId: orderDetails.id,
      pickupLat: String(orderDetails.pickupLat),
      pickupLng: String(orderDetails.pickupLng),
      vehicleType: orderDetails.vehicleType,
      weightKg: String(orderDetails.weightKg),
      fare: String(orderDetails.totalFare),
      countdownSeconds: '120',
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'order_alert.mp3',
        channelId: 'dakiya_order_dispatches',
        priority: 'max',
      },
    },
  }

  try {
    const response = await admin.messaging().send(message)
    console.log('[FCM] Successfully sent order alert to agent:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('[FCM] Failed to send order alert:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 2. Send Order Status Update to Customer
 * e.g. Agent Accepted, Time Slot Counter-Offer, Out for Delivery, Delivered.
 */
export async function sendOrderStatusNotificationToUser(userFcmToken, updateData) {
  const message = {
    token: userFcmToken,
    notification: {
      title: updateData.title,
      body: updateData.body,
    },
    data: {
      type: 'ORDER_STATUS_UPDATE',
      orderId: updateData.orderId,
      status: updateData.status,
      agentName: updateData.agentName || '',
      agentPhone: updateData.agentPhone || '',
      proposedTime: updateData.proposedTime || '',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'dakiya_user_updates',
      },
    },
  }

  try {
    const response = await admin.messaging().send(message)
    console.log('[FCM] Successfully sent status update to user:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('[FCM] Failed to send status update:', error)
    return { success: false, error: error.message }
  }
}
