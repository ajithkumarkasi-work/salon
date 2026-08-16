import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
})
export class AppointmentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AppointmentGateway.name);
  private userSockets = new Map<string, string[]>(); // userId → socketIds

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_SECRET') });
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      // Track user socket
      const existing = this.userSockets.get(payload.sub) ?? [];
      this.userSockets.set(payload.sub, [...existing, client.id]);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = (this.userSockets.get(userId) ?? []).filter((id) => id !== client.id);
      if (sockets.length === 0) {
        this.userSockets.delete(userId);
      } else {
        this.userSockets.set(userId, sockets);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:salon')
  handleJoinSalon(@ConnectedSocket() client: Socket, @MessageBody() salonId: string) {
    client.join(`salon:${salonId}`);
    this.logger.log(`Client ${client.id} joined salon room: ${salonId}`);
  }

  @SubscribeMessage('leave:salon')
  handleLeaveSalon(@ConnectedSocket() client: Socket, @MessageBody() salonId: string) {
    client.leave(`salon:${salonId}`);
  }

  emitToSalon(salonId: string, event: string, data: any) {
    this.server.to(`salon:${salonId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  emitToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId) ?? [];
    socketIds.forEach((socketId) => {
      this.server.to(socketId).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, { ...data, timestamp: new Date().toISOString() });
  }
}
