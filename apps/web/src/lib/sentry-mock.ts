// Mock Sentry implementation for when Sentry is not available
export const Sentry = {
  init: (config: any) => {
    console.log('Sentry mock initialized', config);
  },
  captureException: (error: Error) => {
    console.error('Error captured (mock):', error);
    return 'mock-event-id';
  },
  captureMessage: (message: string) => {
    console.log('Message captured (mock):', message);
    return 'mock-event-id';
  },
  withScope: (callback: (scope: any) => void) => {
    const mockScope = {
      setTag: (key: string, value: string) => {},
      setContext: (key: string, value: any) => {},
      setUser: (user: any) => {},
      setLevel: (level: string) => {},
    };
    callback(mockScope);
  },
  setUser: (user: any) => {},
  setTag: (key: string, value: string) => {},
  setContext: (key: string, value: any) => {},
  addBreadcrumb: (breadcrumb: any) => {},
  startTransaction: (transactionContext: any) => ({
    setTag: (key: string, value: string) => {},
    setData: (key: string, value: any) => {},
    finish: () => {},
  }),
  Replay: class {
    constructor(config: any) {}
  },
  Integrations: {
    Http: class {
      constructor(config: any) {}
    },
    RequestData: class {
      constructor(config: any) {}
    },
  },
};