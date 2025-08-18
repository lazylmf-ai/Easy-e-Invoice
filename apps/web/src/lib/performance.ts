// Performance utilities and optimization helpers

import { trackPerformanceIssue } from '@einvoice/shared/monitoring/sentry';

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: Map<string, PerformanceObserver> = new Map();
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start monitoring web vitals
  startWebVitalsMonitoring() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lcpEntry = entries[entries.length - 1];
      const lcp = lcpEntry.startTime;
      this.recordMetric('LCP', lcp);
      
      if (lcp > 2500) {
        trackPerformanceIssue('LCP', lcp, 2500, { type: 'web-vital' });
      }
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entries) => {
      entries.forEach((entry: any) => {
        const fid = entry.processingStart - entry.startTime;
        this.recordMetric('FID', fid);
        
        if (fid > 100) {
          trackPerformanceIssue('FID', fid, 100, { type: 'web-vital' });
        }
      });
    });

    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (entries) => {
      let clsValue = 0;
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      if (clsValue > 0) {
        this.recordMetric('CLS', clsValue);
        
        if (clsValue > 0.1) {
          trackPerformanceIssue('CLS', clsValue, 0.1, { type: 'web-vital' });
        }
      }
    });

    // Navigation timing
    this.observeMetric('navigation', (entries) => {
      entries.forEach((entry: any) => {
        const ttfb = entry.responseStart - entry.requestStart;
        const domComplete = entry.domComplete - entry.navigationStart;
        const loadComplete = entry.loadEventEnd - entry.navigationStart;
        
        this.recordMetric('TTFB', ttfb);
        this.recordMetric('DOM_COMPLETE', domComplete);
        this.recordMetric('LOAD_COMPLETE', loadComplete);
        
        if (ttfb > 600) {
          trackPerformanceIssue('TTFB', ttfb, 600, { type: 'navigation' });
        }
      });
    });
  }

  // Observe specific performance metrics
  private observeMetric(type: string, callback: (entries: PerformanceEntry[]) => void) {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ entryTypes: [type] });
      this.observers.set(type, observer);
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  // Record metric value
  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  // Get metric statistics
  getMetricStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      count: values.length
    };
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// High-performance debounce with immediate option
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T {
  let timeout: NodeJS.Timeout | null = null;
  let result: ReturnType<T>;

  const debounced = function (this: any, ...args: Parameters<T>) {
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) {
        result = func.apply(this, args);
      }
    }, wait);
    
    if (callNow) {
      result = func.apply(this, args);
    }
    
    return result;
  } as T;

  // Add cancel method
  (debounced as any).cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

// Advanced throttle with trailing and leading options
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T {
  const { leading = true, trailing = true } = options;
  let inThrottle = false;
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  let result: ReturnType<T>;

  const throttled = function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      if (leading) {
        result = func.apply(this, args);
      }
      lastRan = Date.now();
      inThrottle = true;
    } else {
      if (trailing) {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            result = func.apply(this, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    }
    
    setTimeout(() => {
      inThrottle = false;
    }, limit);
    
    return result;
  } as T;

  return throttled;
}

// Memoization with TTL and size limits
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    maxSize?: number;
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const { maxSize = 100, ttl = 5 * 60 * 1000, keyGenerator } = options;
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  const memoized = function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    const now = Date.now();
    
    // Check if cached value exists and is not expired
    const cached = cache.get(key);
    if (cached && (now - cached.timestamp < ttl)) {
      return cached.value;
    }
    
    // Compute new value
    const value = fn.apply(this, args);
    
    // Clean up expired entries
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    
    // Store new value
    cache.set(key, { value, timestamp: now });
    
    return value;
  } as T;

  // Add cache management methods
  (memoized as any).clear = () => cache.clear();
  (memoized as any).delete = (key: string) => cache.delete(key);
  (memoized as any).size = () => cache.size;

  return memoized;
}

// Bundle size monitoring
export function trackBundleSize() {
  if (typeof window === 'undefined') return;

  // Monitor bundle loading
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.name.includes('chunk') || entry.name.includes('bundle')) {
        const size = (entry as any).transferSize || 0;
        if (size > 500000) { // 500KB threshold
          trackPerformanceIssue('large-bundle', size, 500000, {
            bundleName: entry.name,
            type: 'bundle-size'
          });
        }
      }
    });
  });

  try {
    observer.observe({ entryTypes: ['resource'] });
  } catch (error) {
    console.warn('Bundle size tracking not supported:', error);
  }
}

// Resource loading optimization
export function preloadCriticalResources(resources: Array<{
  href: string;
  as: 'script' | 'style' | 'font' | 'image';
  crossorigin?: string;
  type?: string;
}>) {
  if (typeof document === 'undefined') return;

  resources.forEach(({ href, as, crossorigin, type }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (crossorigin) {
      link.crossOrigin = crossorigin;
    }
    
    if (type) {
      link.type = type;
    }
    
    document.head.appendChild(link);
  });
}

// Critical CSS injection
export function injectCriticalCSS(css: string, id: string) {
  if (typeof document === 'undefined') return;

  // Check if already injected
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  
  // Insert before any other stylesheets
  const firstStylesheet = document.querySelector('link[rel="stylesheet"]');
  if (firstStylesheet) {
    document.head.insertBefore(style, firstStylesheet);
  } else {
    document.head.appendChild(style);
  }
}

// Image optimization utilities
export function optimizeImageLoading() {
  if (typeof window === 'undefined') return;

  // Native lazy loading support check
  const supportsNativeLazyLoading = 'loading' in HTMLImageElement.prototype;
  
  if (!supportsNativeLazyLoading) {
    // Fallback to intersection observer
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

// Malaysian-specific performance optimizations
export const malaysianOptimizations = {
  // TIN validation performance cache
  tinValidationCache: memoize(
    (tin: string) => {
      // This would be the actual validation logic
      return { isValid: true, type: 'corporate' };
    },
    { ttl: 24 * 60 * 60 * 1000, maxSize: 1000 } // 24 hour cache
  ),

  // Industry code lookup optimization
  industryCodeCache: memoize(
    (code: string) => {
      // Industry code validation logic
      return { isValid: true, category: 'service' };
    },
    { ttl: 7 * 24 * 60 * 60 * 1000, maxSize: 500 } // 7 day cache
  ),

  // SST calculation optimization
  calculateSST: memoize(
    (amount: number, rate: number = 6) => {
      return Math.round(amount * rate) / 100;
    },
    { ttl: 60 * 60 * 1000, maxSize: 10000 } // 1 hour cache
  ),

  // CSV processing with web workers
  processCSVInWorker: async (csvData: string) => {
    if (typeof Worker === 'undefined') {
      throw new Error('Web Workers not supported');
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/csv-processor.js');
      
      worker.postMessage({ csvData });
      
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
      
      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };
      
      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('CSV processing timeout'));
        worker.terminate();
      }, 30000);
    });
  }
};

// Initialize performance monitoring
export function initializePerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  const monitor = PerformanceMonitor.getInstance();
  monitor.startWebVitalsMonitoring();
  
  trackBundleSize();
  optimizeImageLoading();
  
  // Report performance metrics periodically
  setInterval(() => {
    const lcpStats = monitor.getMetricStats('LCP');
    const fidStats = monitor.getMetricStats('FID');
    const clsStats = monitor.getMetricStats('CLS');
    
    if (lcpStats || fidStats || clsStats) {
      console.log('Performance Metrics:', {
        LCP: lcpStats,
        FID: fidStats,
        CLS: clsStats
      });
    }
  }, 60000); // Every minute
}

export default {
  PerformanceMonitor,
  debounce,
  throttle,
  memoize,
  trackBundleSize,
  preloadCriticalResources,
  injectCriticalCSS,
  optimizeImageLoading,
  malaysianOptimizations,
  initializePerformanceMonitoring
};