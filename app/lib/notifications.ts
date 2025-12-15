import { firestore } from "@/app/lib/firebase_config";
import { addDoc, collection, Timestamp } from "firebase/firestore";

export type NotificationType = 
  | "application_approved"
  | "application_rejected"
  | "receipt_confirmed"
  | "payment_completed"
  | "new_application";

export interface NotificationData {
  user_uuid: string;
  type: NotificationType;
  title: string;
  message: string;
  listing_id?: string;
  application_id?: string;
  read: boolean;
  created_at: ReturnType<typeof Timestamp.now>;
}

export async function createNotification(data: Omit<NotificationData, "read" | "created_at">): Promise<string> {
  const col = collection(firestore, "notifications");
  const docRef = await addDoc(col, {
    ...data,
    read: false,
    created_at: Timestamp.now(),
  });
  return docRef.id;
}

// Helper functions for common notification types
export async function notifyApplicationApproved(
  renterUuid: string,
  listingTitle: string,
  listingId: string,
  applicationId: string
): Promise<string> {
  return createNotification({
    user_uuid: renterUuid,
    type: "application_approved",
    title: "Application Approved!",
    message: `Your application for "${listingTitle}" has been approved. Pick up the item and confirm receipt to complete the rental.`,
    listing_id: listingId,
    application_id: applicationId,
  });
}

export async function notifyApplicationRejected(
  renterUuid: string,
  listingTitle: string,
  listingId: string,
  applicationId: string
): Promise<string> {
  return createNotification({
    user_uuid: renterUuid,
    type: "application_rejected",
    title: "Application Not Selected",
    message: `Your application for "${listingTitle}" was not selected. The owner chose another applicant.`,
    listing_id: listingId,
    application_id: applicationId,
  });
}

export async function notifyReceiptConfirmed(
  ownerUuid: string,
  listingTitle: string,
  listingId: string,
  applicationId: string
): Promise<string> {
  return createNotification({
    user_uuid: ownerUuid,
    type: "receipt_confirmed",
    title: "Item Picked Up",
    message: `The renter has confirmed receipt of "${listingTitle}" and is completing payment.`,
    listing_id: listingId,
    application_id: applicationId,
  });
}

export async function notifyPaymentCompleted(
  userUuid: string,
  listingTitle: string,
  listingId: string,
  applicationId: string,
  isOwner: boolean
): Promise<string> {
  return createNotification({
    user_uuid: userUuid,
    type: "payment_completed",
    title: "Payment Complete",
    message: isOwner
      ? `Payment received for "${listingTitle}". The rental is now active.`
      : `Your payment for "${listingTitle}" is complete. Enjoy your rental!`,
    listing_id: listingId,
    application_id: applicationId,
  });
}

export async function notifyNewApplication(
  ownerUuid: string,
  listingTitle: string,
  listingId: string,
  applicationId: string
): Promise<string> {
  return createNotification({
    user_uuid: ownerUuid,
    type: "new_application",
    title: "New Application",
    message: `Someone applied to rent "${listingTitle}". Review their application now.`,
    listing_id: listingId,
    application_id: applicationId,
  });
}

