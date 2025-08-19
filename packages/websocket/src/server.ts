// WebSocket Server Implementation for Easy e-Invoice
// Cloudflare Workers compatible WebSocket server with Durable Objects

import { v4 as uuidv4 } from 'uuid';
import {
  WebSocketServer,
  WebSocketConnection,
  WebSocketMessage,
  WebSocketConfig,
  SubscriptionFilter,
  ConnectionAuth,
  MessageType,
  ConnectionStatus,
  WebSocketError,
  ConnectionLimitError,
  AuthenticationError,
  RateLimitError,
  MessageSizeError,
  DEFAULT_WEBSOCKET_CONFIG
} from './types';

export class CloudflareWebSocketServer implements WebSocketServer {
  private connections = new Map<string, WebSocketConnection>();
  private stats = {
    messagesSent: 0,
    messagesReceived: 0,
    startTime: Date.now()
  };
  
  constructor(
    private storage: DurableObjectStorage,
    private config: WebSocketConfig = DEFAULT_WEBSOCKET_CONFIG
  ) {
    // Start heartbeat interval
    if (this.config.enableHeartbeat) {
      this.startHeartbeat();
    }
  }

  async handleConnection(socket: WebSocket, request: Request): Promise<void> {
    try {
      // Check connection limit
      if (this.connections.size >= this.config.maxConnections) {
        throw new ConnectionLimitError(this.config.maxConnections);
      }

      // Authenticate connection
      const auth = await this.authenticateConnection(request);
      
      // Create connection
      const connectionId = uuidv4();
      const connection: WebSocketConnection = {
        id: connectionId,
        userId: auth.userId,
        organizationId: auth.organizationId,
        connectedAt: new Date(),
        lastPing: new Date(),
        subscriptions: new Set(),
        socket
      };

      this.connections.set(connectionId, connection);

      // Set up socket event handlers
      this.setupSocketHandlers(connection);

      // Send connection confirmation
      await this.sendToConnection(connectionId, {
        id: uuidv4(),
        type: MessageType.CONNECT,
        timestamp: new Date().toISOString(),
        userId: auth.userId,
        organizationId: auth.organizationId,
        data: {
          connectionId,
          serverTime: new Date().toISOString(),
          config: {
            pingInterval: this.config.pingInterval,
            maxMessageSize: this.config.maxMessageSize
          }
        }
      } as any);

      console.log(`WebSocket connection established: ${connectionId} for user ${auth.userId}`);

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      
      if (error instanceof WebSocketError) {
        socket.close(1008, error.message);
      } else {
        socket.close(1011, 'Internal server error');
      }
    }
  }

  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.socket.close(1000, 'Connection closed by server');
      } catch (error) {
        console.error(`Error closing connection ${connectionId}:`, error);
      }
      
      this.connections.delete(connectionId);
      console.log(`WebSocket connection closed: ${connectionId}`);
    }
  }

  getConnection(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }

  getConnections(filter?: SubscriptionFilter): WebSocketConnection[] {
    const connections = Array.from(this.connections.values());
    
    if (!filter) {
      return connections;
    }

    return connections.filter(connection => {
      if (filter.userId && connection.userId !== filter.userId) {
        return false;
      }
      
      if (filter.organizationId && connection.organizationId !== filter.organizationId) {
        return false;
      }
      
      if (filter.jobId) {
        const jobSubscription = `job:${filter.jobId}`;
        if (!connection.subscriptions.has(jobSubscription)) {
          return false;
        }
      }
      
      return true;
    });
  }

  async broadcast(message: WebSocketMessage, filter?: SubscriptionFilter): Promise<void> {
    const targetConnections = this.getConnections(filter);
    
    const promises = targetConnections.map(connection => 
      this.sendToConnection(connection.id, message)
    );
    
    await Promise.allSettled(promises);
  }

  async sendToUser(userId: string, message: WebSocketMessage): Promise<void> {
    await this.broadcast(message, { userId });
  }

  async sendToOrganization(organizationId: string, message: WebSocketMessage): Promise<void> {
    await this.broadcast(message, { organizationId });
  }

  async sendToConnection(connectionId: string, message: WebSocketMessage): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new WebSocketError(`Connection not found: ${connectionId}`, 'CONNECTION_NOT_FOUND');
    }

    try {
      const messageString = JSON.stringify(message);
      
      // Check message size
      if (messageString.length > this.config.maxMessageSize) {
        throw new MessageSizeError(messageString.length, this.config.maxMessageSize);
      }

      connection.socket.send(messageString);
      this.stats.messagesSent++;
      
    } catch (error) {
      console.error(`Failed to send message to connection ${connectionId}:`, error);
      
      if (error instanceof MessageSizeError) {
        // Send error message about size limit
        const errorMessage = {
          id: uuidv4(),
          type: MessageType.ERROR,
          timestamp: new Date().toISOString(),
          data: {
            errorCode: 'MESSAGE_SIZE_EXCEEDED',
            message: 'Message too large to send',
            recoverable: false
          }
        };
        
        try {
          connection.socket.send(JSON.stringify(errorMessage));
        } catch {
          // If we can't even send the error, close the connection
          await this.closeConnection(connectionId);
        }
      } else {
        // Connection might be broken, remove it
        await this.closeConnection(connectionId);
      }
      
      throw error;
    }
  }

  async subscribe(connectionId: string, filter: SubscriptionFilter): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new WebSocketError(`Connection not found: ${connectionId}`, 'CONNECTION_NOT_FOUND');
    }

    // Create subscription key
    const subscriptionKey = this.createSubscriptionKey(filter);
    connection.subscriptions.add(subscriptionKey);
    
    console.log(`Connection ${connectionId} subscribed to ${subscriptionKey}`);
  }

  async unsubscribe(connectionId: string, filter: SubscriptionFilter): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return; // Connection already gone
    }

    const subscriptionKey = this.createSubscriptionKey(filter);
    connection.subscriptions.delete(subscriptionKey);
    
    console.log(`Connection ${connectionId} unsubscribed from ${subscriptionKey}`);
  }

  async pingAll(): Promise<void> {
    const now = new Date();
    const pingPromises: Promise<void>[] = [];
    
    for (const [connectionId, connection] of this.connections) {
      // Check if connection is stale
      const timeSinceLastPing = now.getTime() - connection.lastPing.getTime();
      
      if (timeSinceLastPing > this.config.pongTimeout * 2) {
        // Connection is stale, remove it
        pingPromises.push(this.closeConnection(connectionId));
        continue;
      }
      
      // Send ping
      const pingMessage = {
        id: uuidv4(),
        type: MessageType.PING,
        timestamp: now.toISOString()
      };
      
      pingPromises.push(
        this.sendToConnection(connectionId, pingMessage as any)
          .catch(error => {
            console.error(`Failed to ping connection ${connectionId}:`, error);
            return this.closeConnection(connectionId);
          })
      );
    }
    
    await Promise.allSettled(pingPromises);
  }

  async getStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    messagesSent: number;
    messagesReceived: number;
    uptime: number;
  }> {
    return {
      totalConnections: this.connections.size,
      activeConnections: this.connections.size, // All connections are considered active
      messagesSent: this.stats.messagesSent,
      messagesReceived: this.stats.messagesReceived,
      uptime: Date.now() - this.stats.startTime
    };
  }

  // Private helper methods
  private async authenticateConnection(request: Request): Promise<ConnectionAuth> {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      throw new AuthenticationError('Missing authentication token');
    }

    try {
      // Verify JWT token (mock implementation)
      const payload = this.verifyJwtToken(token);
      
      return {
        userId: payload.userId,
        organizationId: payload.organizationId,
        permissions: payload.permissions || [],
        token,
        expiresAt: new Date(payload.exp * 1000)
      };
      
    } catch (error) {
      throw new AuthenticationError('Invalid authentication token');
    }
  }

  private verifyJwtToken(token: string): any {
    // Mock JWT verification
    // In real implementation, this would verify the JWT signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(atob(parts[1]));
    
    if (payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    return payload;
  }

  private setupSocketHandlers(connection: WebSocketConnection): void {
    const { socket, id: connectionId } = connection;

    socket.addEventListener('message', async (event) => {
      try {
        this.stats.messagesReceived++;
        
        const message = JSON.parse(event.data as string);
        await this.handleIncomingMessage(connectionId, message);
        
      } catch (error) {
        console.error(`Error handling message from ${connectionId}:`, error);
        
        const errorMessage = {
          id: uuidv4(),
          type: MessageType.ERROR,
          timestamp: new Date().toISOString(),
          data: {
            errorCode: 'MESSAGE_PARSE_ERROR',
            message: 'Failed to parse message',
            recoverable: true
          }
        };
        
        try {
          await this.sendToConnection(connectionId, errorMessage as any);
        } catch {
          await this.closeConnection(connectionId);
        }
      }
    });

    socket.addEventListener('close', () => {
      this.connections.delete(connectionId);
      console.log(`WebSocket connection closed: ${connectionId}`);
    });

    socket.addEventListener('error', (error) => {
      console.error(`WebSocket error for connection ${connectionId}:`, error);
      this.connections.delete(connectionId);
    });
  }

  private async handleIncomingMessage(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    switch (message.type) {
      case MessageType.PONG:
        connection.lastPing = new Date();
        break;
        
      case MessageType.PING:
        await this.sendToConnection(connectionId, {
          id: uuidv4(),
          type: MessageType.PONG,
          timestamp: new Date().toISOString()
        } as any);
        break;
        
      default:
        console.log(`Received message of type ${message.type} from ${connectionId}`);
        break;
    }
  }

  private createSubscriptionKey(filter: SubscriptionFilter): string {
    const parts: string[] = [];
    
    if (filter.jobId) {
      parts.push(`job:${filter.jobId}`);
    }
    
    if (filter.jobType) {
      parts.push(`jobType:${filter.jobType}`);
    }
    
    if (filter.messageTypes) {
      parts.push(`types:${filter.messageTypes.join(',')}`);
    }
    
    return parts.join('|') || 'all';
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.pingAll().catch(error => {
        console.error('Error during heartbeat ping:', error);
      });
    }, this.config.pingInterval);
  }
}