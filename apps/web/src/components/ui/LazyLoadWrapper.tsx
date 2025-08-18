'use client';

import React, { Suspense, lazy, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component
const LoadingSpinner = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  </div>
);

// Error boundary for lazy components
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || (() => (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-600 font-medium">Failed to load component</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      ));
      
      return <FallbackComponent />;
    }

    return this.props.children;
  }
}

// Generic lazy loading wrapper
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  loadingMessage?: string,
  fallback?: React.ComponentType
) {
  const LazyComponent = lazy(importFunc);

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <LazyLoadErrorBoundary fallback={fallback}>
      <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </LazyLoadErrorBoundary>
  ));
}

// Lazy loading wrapper with intersection observer
export function LazyLoadOnScroll({
  children,
  rootMargin = '50px',
  threshold = 0.1,
  placeholder = <LoadingSpinner />,
}: {
  children: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  placeholder?: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold, hasLoaded]);

  return (
    <div ref={elementRef}>
      {isVisible ? children : placeholder}
    </div>
  );
}

// Higher-order component for route-based code splitting
export function withLazyRoute<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  routeName: string
) {
  return createLazyComponent(
    importFunc,
    `Loading ${routeName}...`,
    () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load {routeName}</p>
          <p className="text-sm text-gray-600 mt-1">Please refresh the page</p>
        </div>
      </div>
    )
  );
}

export default {
  createLazyComponent,
  LazyLoadOnScroll,
  withLazyRoute,
  LoadingSpinner,
};