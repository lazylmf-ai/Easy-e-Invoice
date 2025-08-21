import { WebSocketServer, WebSocketConnection, WebSocketMessage, WebSocketConfig, SubscriptionFilter } from './types';
export declare class CloudflareWebSocketServer implements WebSocketServer {
    private storage;
    private config;
    private connections;
    private stats;
    constructor(storage: DurableObjectStorage, config?: WebSocketConfig);
    handleConnection(socket: WebSocket, request: Request): Promise<void>;
    closeConnection(connectionId: string): Promise<void>;
    getConnection(connectionId: string): WebSocketConnection | null;
    getConnections(filter?: SubscriptionFilter): WebSocketConnection[];
    broadcast(message: WebSocketMessage, filter?: SubscriptionFilter): Promise<void>;
    sendToUser(userId: string, message: WebSocketMessage): Promise<void>;
    sendToOrganization(organizationId: string, message: WebSocketMessage): Promise<void>;
    sendToConnection(connectionId: string, message: WebSocketMessage): Promise<void>;
    subscribe(connectionId: string, filter: SubscriptionFilter): Promise<void>;
    unsubscribe(connectionId: string, filter: SubscriptionFilter): Promise<void>;
    pingAll(): Promise<void>;
    getStats(): Promise<{
        totalConnections: number;
        activeConnections: number;
        messagesSent: number;
        messagesReceived: number;
        uptime: number;
    }>;
    private authenticateConnection;
    private verifyJwtToken;
    private setupSocketHandlers;
    private handleIncomingMessage;
    private createSubscriptionKey;
    private startHeartbeat;
}
