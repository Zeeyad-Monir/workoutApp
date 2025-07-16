const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Cloud Function to send push notifications
exports.sendFriendInviteNotification = functions.firestore
  .document('notificationRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const notificationData = snap.data();
    
    // Only process friend invite notifications
    if (notificationData.type !== 'friend_invite') {
      return;
    }
    
    try {
      // Get recipient's FCM token
      const recipientDoc = await admin.firestore()
        .collection('users')
        .doc(notificationData.recipientUserId)
        .get();
      
      if (!recipientDoc.exists) {
        console.error('Recipient user not found');
        return;
      }
      
      const recipientData = recipientDoc.data();
      const fcmToken = recipientData.fcmToken;
      
      if (!fcmToken) {
        console.log('Recipient does not have FCM token');
        return;
      }
      
      // Prepare notification message
      const message = {
        notification: {
          title: 'Friend Request',
          body: notificationData.message,
        },
        data: {
          type: 'friend_invite',
          senderUsername: notificationData.senderUsername,
          timestamp: notificationData.timestamp.toDate().toISOString(),
        },
        token: fcmToken,
      };
      
      // Send notification
      await admin.messaging().send(message);
      console.log('Friend invite notification sent successfully');
      
      // Mark notification as processed
      await snap.ref.update({ processed: true });
      
    } catch (error) {
      console.error('Error sending friend invite notification:', error);
      
      // Mark notification as failed
      await snap.ref.update({ 
        processed: true,
        error: error.message,
      });
    }
  });