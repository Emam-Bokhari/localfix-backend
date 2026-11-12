import { Types } from "mongoose";
import { User } from "../../user/user.model";
import { STATUS, USER_ROLES } from "../../../../enums/user";

export interface IChatPermissionResult {
  allowed: boolean;
  reason: string;
}

const VALID_CHAT_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.HOME_OWNER,
  USER_ROLES.PROFESSIONAL,
];

/**
 * Centrally validates if chat communication is allowed between sender and receiver.
 */
export const checkChatPermission = async (
  senderId: string | Types.ObjectId,
  receiverId: string | Types.ObjectId,
): Promise<IChatPermissionResult> => {
  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);

  // 0. Verify sender is not receiver (prevent self-chat)
  if (senderId.toString() === receiverId.toString()) {
    return {
      allowed: false,
      reason: "You cannot create a chat with yourself.",
    };
  }

  // 1. Verify user exists
  if (!sender) {
    return { allowed: false, reason: "Sender user account not found." };
  }
  if (!receiver) {
    return { allowed: false, reason: "Receiver user account not found." };
  }

  // 2. Verify blocked status (User status)
  if (sender.status === STATUS.INACTIVE) {
    return {
      allowed: false,
      reason: "Sender is currently suspended or inactive.",
    };
  }
  if (receiver.status === STATUS.INACTIVE) {
    return { allowed: false, reason: "Receiver user is blocked or suspended." };
  }

  // 3. Verify valid project roles
  if (
    !VALID_CHAT_ROLES.includes(sender.role) ||
    !VALID_CHAT_ROLES.includes(receiver.role)
  ) {
    return {
      allowed: false,
      reason: "Invalid user role for chat communication.",
    };
  }

  return { allowed: true, reason: "Allowed" };
};

export const chatPermissionHelper = {
  checkChatPermission,
};
