// Easy e-Invoice WebSocket Package
// Main exports for real-time progress tracking and notifications

export * from './types';
export * from './server';
export * from './progress-tracker';

// Re-export commonly used types
export {
  WebSocketMessage,
  WebSocketConnection,
  WebSocketServer,
  ProgressTracker,
  MessageType,
  ConnectionStatus,
  SubscriptionFilter,
  WebSocketConfig,
  WebSocketError,
  ConnectionLimitError,
  AuthenticationError,
  RateLimitError,
  MessageSizeError,
  DEFAULT_WEBSOCKET_CONFIG
} from './types';

// Re-export main implementations
export { CloudflareWebSocketServer } from './server';
export { JobProgressTracker } from './progress-tracker';

// Utility functions for WebSocket management
export const createWebSocketServer = (
  storage: DurableObjectStorage,
  config?: Partial<WebSocketConfig>
) => {
  return new CloudflareWebSocketServer(storage, { ...DEFAULT_WEBSOCKET_CONFIG, ...config });
};

export const createProgressTracker = (
  webSocketServer: WebSocketServer,
  storage: DurableObjectStorage
) => {
  return new JobProgressTracker(webSocketServer, storage);
};

// Message validation helpers
export const validateWebSocketMessage = (message: unknown): message is WebSocketMessage => {
  try {
    if (typeof message !== 'object' || message === null) {
      return false;
    }
    
    const msg = message as any;
    return (
      typeof msg.id === 'string' &&
      typeof msg.type === 'string' &&
      typeof msg.timestamp === 'string' &&
      Object.values(MessageType).includes(msg.type)
    );
  } catch {
    return false;
  }
};

// Connection management helpers
export const isConnectionActive = (connection: WebSocketConnection): boolean => {
  const now = Date.now();
  const lastPingTime = connection.lastPing.getTime();
  const connectionAge = now - connection.connectedAt.getTime();
  
  // Consider connection active if last ping was within 2 minutes or connection is new
  return (now - lastPingTime) < 120000 || connectionAge < 10000;
};

export const getConnectionUptime = (connection: WebSocketConnection): number => {
  return Date.now() - connection.connectedAt.getTime();
};

// Progress calculation helpers
export const calculateProgress = (
  completedSteps: number,
  totalSteps: number
): number => {
  if (totalSteps <= 0) return 0;
  return Math.min(100, Math.max(0, (completedSteps / totalSteps) * 100));
};

export const estimateTimeRemaining = (
  startTime: Date,
  currentProgress: number
): number | null => {
  if (currentProgress <= 0 || currentProgress >= 100) {
    return null;
  }
  
  const elapsed = Date.now() - startTime.getTime();
  const totalEstimated = elapsed / (currentProgress / 100);
  return totalEstimated - elapsed;
};

// Malaysian business context helpers
export const getMalaysianTimeZone = (): string => {
  return 'Asia/Kuala_Lumpur';
};

export const formatMalaysianDateTime = (date: Date): string => {
  return date.toLocaleString('en-MY', {
    timeZone: getMalaysianTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const isWithinMalaysianBusinessHours = (date: Date = new Date()): boolean => {
  const malaysianTime = new Date(date.toLocaleString('en-US', { 
    timeZone: getMalaysianTimeZone() 
  }));
  
  const hours = malaysianTime.getHours();
  const day = malaysianTime.getDay();
  
  // Monday to Friday, 9 AM to 6 PM
  return day >= 1 && day <= 5 && hours >= 9 && hours < 18;
};

// Notification priority helpers
export const getNotificationPriority = (messageType: MessageType): 'low' | 'medium' | 'high' | 'critical' => {
  switch (messageType) {
    case MessageType.ERROR:
    case MessageType.JOB_FAILED:
    case MessageType.COMPLIANCE_ALERT:
      return 'critical';
      
    case MessageType.JOB_STATUS_CHANGE:
    case MessageType.MYINVOIS_UPDATE:
    case MessageType.SYSTEM_NOTIFICATION:
      return 'high';
      
    case MessageType.JOB_PROGRESS:
    case MessageType.FILE_PROCESSING_START:
    case MessageType.FILE_PROCESSING_COMPLETE:
      return 'medium';
      
    case MessageType.FILE_UPLOAD_PROGRESS:
    case MessageType.USER_NOTIFICATION:
      return 'low';
      
    default:
      return 'medium';
  }
};

export const shouldShowDesktopNotification = (messageType: MessageType): boolean => {
  const priority = getNotificationPriority(messageType);
  return priority === 'critical' || priority === 'high';
};

// Rate limiting helpers
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, number[]>();
  
  return (connectionId: string): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests for this connection
    const connectionRequests = requests.get(connectionId) || [];
    
    // Filter out requests outside the window
    const validRequests = connectionRequests.filter(time => time > windowStart);
    
    // Check if limit is exceeded
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    requests.set(connectionId, validRequests);
    
    return true;
  };
};

// Error handling helpers
export const createErrorMessage = (
  errorCode: string,
  message: string,
  recoverable: boolean = false
): WebSocketMessage => {
  return {
    id: uuidv4(),
    type: MessageType.ERROR,
    timestamp: new Date().toISOString(),
    data: {
      errorCode,
      message,
      recoverable,
      retryable: recoverable
    }
  } as any;
};

export const isRetryableError = (error: WebSocketError): boolean => {
  return error.code !== 'AUTHENTICATION_FAILED' && 
         error.code !== 'MESSAGE_SIZE_EXCEEDED' &&
         error.code !== 'CONNECTION_LIMIT_EXCEEDED';
};

// Subscription management helpers
export const createJobSubscription = (jobId: string): SubscriptionFilter => {
  return { jobId };
};

export const createOrganizationSubscription = (organizationId: string): SubscriptionFilter => {
  return { organizationId };
};

export const createUserSubscription = (userId: string): SubscriptionFilter => {
  return { userId };
};

export const createMessageTypeSubscription = (messageTypes: MessageType[]): SubscriptionFilter => {
  return { messageTypes };
};

// Statistics helpers
export const calculateConnectionStats = (connections: WebSocketConnection[]) => {
  const now = Date.now();
  
  return {
    total: connections.length,
    active: connections.filter(isConnectionActive).length,
    byOrganization: connections.reduce((acc, conn) => {
      acc[conn.organizationId] = (acc[conn.organizationId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    averageUptime: connections.length > 0 
      ? connections.reduce((sum, conn) => sum + getConnectionUptime(conn), 0) / connections.length 
      : 0,
    oldestConnection: connections.reduce((oldest, conn) => 
      !oldest || conn.connectedAt < oldest.connectedAt ? conn : oldest, 
      null as WebSocketConnection | null
    )
  };
};

// Default exports for easy imports
export default {
  createWebSocketServer,
  createProgressTracker,
  validateWebSocketMessage,
  isConnectionActive,
  calculateProgress,
  estimateTimeRemaining,
  getMalaysianTimeZone,
  formatMalaysianDateTime,
  isWithinMalaysianBusinessHours,
  getNotificationPriority,
  shouldShowDesktopNotification,
  createRateLimiter,
  createErrorMessage,
  isRetryableError
};

// Import uuid for ID generation
import { v4 as uuidv4 } from 'uuid';