import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateRentalMessageData {
  rentalId: string;
  senderId: string;
  senderType: 'CUSTOMER' | 'DRIVER';
  content: string;
}

export interface RentalMessage {
  id: string;
  rentalId: string;
  senderId: string;
  senderType: 'CUSTOMER' | 'DRIVER';
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export class RentalMessageService {
  async createMessage(data: CreateRentalMessageData): Promise<RentalMessage> {
    const message = await prisma.rentalMessage.create({
      data: {
        rentalId: data.rentalId,
        senderId: data.senderId,
        senderType: data.senderType,
        content: data.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

    // Update chat metadata in rental request
    await prisma.rentalRequest.update({
      where: { id: data.rentalId },
      data: {
        chatMeta: {
          lastMessage: data.content,
          lastMessageAt: new Date().toISOString(),
          lastSenderId: data.senderId,
          lastSenderType: data.senderType,
          unreadCount: {
            [data.senderType === 'CUSTOMER' ? 'driver' : 'customer']: 1,
          },
        },
      },
    });

    return message as RentalMessage;
  }

  async getMessagesByRentalId(rentalId: string): Promise<RentalMessage[]> {
    const messages = await prisma.rentalMessage.findMany({
      where: { rentalId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages as RentalMessage[];
  }

  async markMessagesAsRead(rentalId: string, userId: string): Promise<void> {
    await prisma.rentalMessage.updateMany({
      where: {
        rentalId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    // Reset unread count for this user
    await prisma.rentalRequest.update({
      where: { id: rentalId },
      data: {
        chatMeta: {
          unreadCount: {
            [userId]: 0,
          },
        },
      },
    });
  }

  async getUnreadCount(rentalId: string, userId: string): Promise<number> {
    const count = await prisma.rentalMessage.count({
      where: {
        rentalId,
        senderId: { not: userId },
        isRead: false,
      },
    });

    return count;
  }

  async getUnreadMessageCount(rentalId: string, userId: string): Promise<number> {
    const count = await prisma.rentalMessage.count({
      where: {
        rentalId,
        senderId: { not: userId },
        isRead: false,
      },
    });

    return count;
  }
}

export const rentalMessageService = new RentalMessageService();
