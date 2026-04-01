// src/modules/events/events.gateway.ts
// WebSocket gateway — pushes real-time events to connected frontend clients.
// Events: new-post, new-sentiment, new-alert
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('🔌 WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Emit a new post event to all connected clients */
  emitNewPost(data: { postId: string; assetSymbol: string; content: string; author: string }) {
    this.server.emit('new-post', data);
  }

  /** Emit a new sentiment result to all connected clients */
  emitNewSentiment(data: {
    postId: string;
    sentimentScore: number;
    impactScore: number;
    confidence: number;
    category: string;
    isWhaleAlert: boolean;
  }) {
    this.server.emit('new-sentiment', data);
  }

  /** Emit a new alert to a specific user (by room) or broadcast */
  emitNewAlert(data: {
    userId: string;
    alertId: string;
    message: string;
    type: string;
    metadata?: Record<string, unknown>;
  }) {
    // Emit to user's room if they're subscribed, otherwise broadcast
    this.server.to(`user:${data.userId}`).emit('new-alert', data);
    // Also broadcast for dashboard listeners
    this.server.emit('new-alert-broadcast', data);
  }
}
