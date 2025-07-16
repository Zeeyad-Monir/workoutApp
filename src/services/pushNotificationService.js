import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

class PushNotificationService {
  async sendFriendInviteNotification(recipientUserId, senderUsername) {
    try {
      // Call Firebase Cloud Function to send notification
      const sendNotification = httpsCallable(functions, 'sendFriendInviteNotification');
      
      const result = await sendNotification({
        recipientUserId: recipientUserId,
        senderUsername: senderUsername,
        message: `${senderUsername} has sent you a friend invite on Comp Fit!`
      });

      console.log('Notification sent successfully:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error sending friend invite notification:', error);
      throw error;
    }
  }
}

export default new PushNotificationService();