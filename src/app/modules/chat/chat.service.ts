import { Chat } from "./chat.model";
import mongoose from "mongoose";
import { User } from "../user/user.model";
import { Message } from "../message/message.model";
import ApiError from "../../../errors/ApiErrors";
import { MESSAGE_TYPE } from "../../../enums/message";
import { chatSocketHelper } from "./socket/chat.socket";

const createChatIntoDB = async (participants: string[]) => {
  // Deduplicate participants to avoid duplicate entries in the array and duplicate socket emissions
  const uniqueParticipants = [
    ...new Set(participants.map((p) => p.toString())),
  ];

  if (uniqueParticipants.length < 2) {
    throw new ApiError(
      400,
      "Chat requires at least two distinct participants.",
    );
  }

  const query: any = {
    participants: {
      $size: uniqueParticipants.length,
      $all: uniqueParticipants,
    },
    isDeleted: { $ne: true },
  };

  const isExistChat = await Chat.findOne(query);

  if (isExistChat) {
    // If the chat was previously soft-deleted by this user, restore it
    if (isExistChat.deletedBy && isExistChat.deletedBy.length > 0) {
      await Chat.findByIdAndUpdate(isExistChat._id, {
        $pull: { deletedBy: { $in: uniqueParticipants } },
        isDeleted: false,
      });
    }
    return isExistChat;
  }

  const newChat = await Chat.create({
    participants: uniqueParticipants,
    lastMessage: null,
  });
  if (!newChat) {
    throw new ApiError(500, "Failed to create chat");
  }

  uniqueParticipants.forEach((participant) => {
    chatSocketHelper.emitNewChat(participant, newChat);
  });
  return newChat;
};

const markChatAsRead = async (userId: string, chatId: string) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  const isParticipant = chat.participants.some(
    (p: any) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this chat");
  }

  const result = await Chat.findByIdAndUpdate(
    chatId,
    { $addToSet: { readBy: userId } },
    { new: true },
  ).lean();

  // Mark all messages in this chat from other participants as read
  await Message.updateMany(
    {
      chatId,
      sender: { $ne: userId },
      read: false,
    },
    {
      $set: { read: true, readAt: new Date() },
    },
  );

  // Emit socket notification to update the unread count/state
  chatSocketHelper.emitUnreadCountUpdate(userId, {
    chatId,
    action: "read",
  });

  if (result) {
    return {
      ...result,
      read: true,
      isRead: true,
      unreadCount: 0,
    };
  }

  return result;
};

const enrichChatsWithUnreadCount = async (
  rawChats: any[],
  userId: string,
) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  return Promise.all(
    rawChats.map(async (chat) => {
      const otherParticipantIds = chat.participants.filter(
        (participantId: any) =>
          participantId && participantId.toString() !== userId.toString(),
      );

      const otherParticipants = await User.find({
        _id: { $in: otherParticipantIds },
      })
        .select("_id name profileImage email role companyName phone")
        .lean();

      const unreadCount = await Message.countDocuments({
        chatId: chat._id,
        sender: { $ne: userObjectId },
        read: false,
        isDeleted: false,
      });

      return {
        ...chat,
        participants: otherParticipants,
        read: unreadCount === 0,
        isRead: unreadCount === 0,
        unreadCount,
      };
    }),
  );
};

const getAllChatsFromDB = async (
  userId: string,
  query: Record<string, any>,
) => {
  const searchTerm = query.searchTerm?.toLowerCase();
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const chatQuery: any = {
    participants: { $in: [userObjectId] },
    deletedBy: { $ne: userObjectId },
    isDeleted: { $ne: true },
  };

  let chats;
  let totalChats;
  let unreadChatsCount = 0;
  let totalUnreadMessages = 0;

  if (searchTerm) {
    const allChats = await Chat.find(chatQuery)
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "_id name profileImage email role companyName",
        },
      })
      .lean()
      .sort({ updatedAt: -1 });

    const allChatLists = await enrichChatsWithUnreadCount(allChats, userId);

    const filteredChats = allChatLists.filter((chat) =>
      chat.participants.some(
        (participant: any) =>
          participant.name &&
          participant.name.toLowerCase().includes(searchTerm),
      ),
    );

    totalChats = filteredChats.length;
    unreadChatsCount = filteredChats.filter(
      (chat) => chat.unreadCount > 0,
    ).length;
    totalUnreadMessages = filteredChats.reduce(
      (total, chat) => total + chat.unreadCount,
      0,
    );
    chats = filteredChats.slice(skip, skip + limit);
  } else {
    totalChats = await Chat.countDocuments(chatQuery);

    const rawChats = await Chat.find(chatQuery)
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "_id name profileImage email role companyName",
        },
      })
      .lean()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    chats = await enrichChatsWithUnreadCount(rawChats, userId);

    const allChatIds = await Chat.find(chatQuery).distinct("_id");
    if (allChatIds.length > 0) {
      const unreadSummary = await Message.aggregate([
        {
          $match: {
            chatId: { $in: allChatIds },
            sender: { $ne: userObjectId },
            read: false,
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: "$chatId",
            count: { $sum: 1 },
          },
        },
      ]);

      unreadChatsCount = unreadSummary.length;
      totalUnreadMessages = unreadSummary.reduce(
        (total, item) => total + item.count,
        0,
      );
    }
  }

  const totalPage = Math.ceil(totalChats / limit);

  return {
    data: chats,
    unreadChatsCount,
    totalUnreadMessages,
    meta: {
      limit,
      page,
      total: totalChats,
      totalPage,
    },
  };
};

const getChatImagesFromDB = async (chatId: string, userId: string) => {
  // check chat existence
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  // verify user is participant
  const isParticipant = chat.participants.some(
    (p: any) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this chat");
  }

  // ========================GET IMAGES DATA=======================
  // Return all images in this chat sent by any participant
  const images = await Message.find({
    chatId,
    isDeleted: { $ne: true },
    $or: [{ type: MESSAGE_TYPE.IMAGE }, { type: MESSAGE_TYPE.BOTH }],
  })
    .sort({ createdAt: -1 })
    .select("image -_id")
    .lean();

  // return only image URLs as array
  return images.map((msg) => msg.image).filter(Boolean);
};

const softDeleteChatForUser = async (chatId: string, id: string) => {
  const userId = new mongoose.Types.ObjectId(id);
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (!chat.participants.some((id) => id.toString() === userId.toString())) {
    throw new ApiError(401, "User is not authorized");
  }

  // If already deleted by this user, just return
  if (chat.deletedBy.some((id) => id.toString() === userId.toString())) {
    return chat;
  }

  // Add userId to deletedBy array
  chat.deletedBy.push(userId);

  // If all participants deleted, mark status deleted (soft delete for everyone)
  if (chat.deletedBy.length === chat.participants.length) {
    chat.isDeleted = true;
  }

  await chat.save();

  chat.participants.forEach((participant) => {
    chatSocketHelper.emitChatDeleted(participant.toString(), {
      chatId,
      userId,
    });
  });

  return chat;
};

export const ChatService = {
  createChatIntoDB,
  getAllChatsFromDB,
  markChatAsRead,
  softDeleteChatForUser,
  getChatImagesFromDB,
};
