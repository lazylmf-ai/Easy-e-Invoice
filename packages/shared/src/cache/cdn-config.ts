// CDN and edge caching configuration for production optimization

export interface CDNConfig {
  // Cloudflare settings
  cloudflare: {
    zoneId: string;
    apiKey: string;
    email: string;
    enabled: boolean;
  };
  
  // Cache rules
  cacheRules: {
    static: {
      ttl: number;
      extensions: string[];
      headers: Record<string, string>;
    };
    api: {
      ttl: number;
      bypassPatterns: string[];
      headers: Record<string, string>;
    };
    dynamic: {
      ttl: number;
      varyHeaders: string[];
      headers: Record<string, string>;
    };
  };

  // Edge locations
  edges: {
    regions: string[];
    geoBlocking: {
      enabled: boolean;
      allowedCountries: string[];
      blockedCountries: string[];
    };
  };

  // Security
  security: {
    waf: {
      enabled: boolean;
      rules: string[];
    };
    ddos: {
      enabled: boolean;
      threshold: number;
    };
    hotlinking: {
      enabled: boolean;
      allowedDomains: string[];
    };
  };
}

// Default CDN configuration for Malaysian e-Invoice system
export const defaultCDNConfig: CDNConfig = {
  cloudflare: {
    zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
    apiKey: process.env.CLOUDFLARE_API_KEY || '',
    email: process.env.CLOUDFLARE_EMAIL || '',
    enabled: process.env.NODE_ENV === 'production'
  },

  cacheRules: {
    // Static assets (CSS, JS, Images, Fonts)
    static: {
      ttl: 31536000, // 1 year
      extensions: [
        'css', 'js', 'map',
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'ico',
        'woff', 'woff2', 'eot', 'ttf', 'otf',
        'pdf', 'zip', 'tar', 'gz'
      ],
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString(),
        'Vary': 'Accept-Encoding',
        'X-Content-Type-Options': 'nosniff'
      }
    },

    // API responses
    api: {
      ttl: 300, // 5 minutes default
      bypassPatterns: [
        '/api/auth/*',
        '/api/invoices/*/submit',
        '/api/organizations/*/settings',
        '/api/users/profile',
        '/api/upload/*',
        '/api/export/*'
      ],
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        'Vary': 'Authorization, Accept-Encoding',
        'X-Cache': 'MISS'
      }
    },

    // Dynamic content
    dynamic: {
      ttl: 60, // 1 minute
      varyHeaders: ['Accept', 'Accept-Language', 'Accept-Encoding', 'User-Agent'],
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        'Vary': 'Accept, Accept-Language, Accept-Encoding',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  },

  edges: {
    regions: [
      'APAC', // Asia Pacific (primary for Malaysia)
      'ENAM', // Eastern North America
      'WNAM', // Western North America
      'EU'    // Europe
    ],
    geoBlocking: {
      enabled: false, // Keep open for international users
      allowedCountries: [], // Empty means all allowed
      blockedCountries: [] // Add specific countries if needed
    }
  },

  security: {
    waf: {
      enabled: true,
      rules: [
        'OWASP Core Rule Set',
        'SQL Injection Protection',
        'XSS Protection',
        'Malaysian Compliance Rules'
      ]
    },
    ddos: {
      enabled: true,
      threshold: 1000 // requests per minute per IP
    },
    hotlinking: {
      enabled: true,
      allowedDomains: [
        process.env.NEXT_PUBLIC_WEB_URL || 'localhost:3000',
        process.env.NEXT_PUBLIC_API_URL || 'localhost:8787'
      ]
    }
  }
};

// Cache control headers for different content types
export const cacheHeaders = {
  // Never cache
  noCache: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },

  // Short cache (1 minute)
  shortCache: {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
    'Vary': 'Accept-Encoding'
  },

  // Medium cache (5 minutes)
  mediumCache: {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    'Vary': 'Accept-Encoding'
  },

  // Long cache (1 hour)
  longCache: {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
    'Vary': 'Accept-Encoding'
  },

  // Very long cache (1 day)
  veryLongCache: {
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    'Vary': 'Accept-Encoding'
  },

  // Immutable cache (1 year for assets with hashes)
  immutableCache: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Vary': 'Accept-Encoding'
  }
};

// Malaysian-specific caching strategies
export const malaysianCacheRules = {
  // TIN validation results
  tinValidation: {
    ttl: 86400, // 24 hours
    headers: cacheHeaders.veryLongCache,
    key: (tin: string) => `tin:${tin}`,
    tags: ['validation', 'tin', 'malaysia']
  },

  // Industry codes (MSIC 2008)
  industryCode: {
    ttl: 604800, // 7 days
    headers: cacheHeaders.immutableCache,
    key: (code: string) => `msic:${code}`,
    tags: ['msic', 'industry', 'malaysia']
  },

  // SST rates and calculations
  sstRates: {
    ttl: 86400, // 24 hours
    headers: cacheHeaders.veryLongCache,
    key: (category: string) => `sst:${category}`,
    tags: ['sst', 'tax', 'malaysia']
  },

  // Exchange rates
  exchangeRates: {
    ttl: 3600, // 1 hour
    headers: cacheHeaders.longCache,
    key: (from: string, to: string, date?: string) => 
      `exchange:${from}:${to}${date ? `:${date}` : ''}`,
    tags: ['exchange', 'currency', 'malaysia']
  },

  // Invoice templates
  invoiceTemplates: {
    ttl: 3600, // 1 hour
    headers: cacheHeaders.longCache,
    key: (orgId: string, templateId: string) => `template:${orgId}:${templateId}`,
    tags: ['template', 'invoice']
  },

  // Organization data
  organization: {
    ttl: 1800, // 30 minutes
    headers: cacheHeaders.mediumCache,
    key: (orgId: string) => `org:${orgId}`,
    tags: ['organization']
  },

  // Public invoice data (for sharing)
  publicInvoice: {
    ttl: 300, // 5 minutes
    headers: cacheHeaders.mediumCache,
    key: (invoiceId: string) => `public:invoice:${invoiceId}`,
    tags: ['invoice', 'public']
  }
};

// Cache invalidation patterns
export const cacheInvalidation = {
  // When organization updates
  organizationUpdate: (orgId: string) => [
    `org:${orgId}`,
    `template:${orgId}:*`,
    `invoice:org:${orgId}:*`
  ],

  // When invoice changes
  invoiceUpdate: (invoiceId: string, orgId: string) => [
    `invoice:${invoiceId}`,
    `public:invoice:${invoiceId}`,
    `invoice:org:${orgId}:*`
  ],

  // When template changes
  templateUpdate: (orgId: string, templateId: string) => [
    `template:${orgId}:${templateId}`,
    `template:${orgId}:*`
  ],

  // When validation rules change
  validationRulesUpdate: () => [
    'validation:*',
    'tin:*',
    'msic:*'
  ],

  // When SST rates change
  sstRatesUpdate: () => [
    'sst:*'
  ],

  // When exchange rates update
  exchangeRatesUpdate: (from?: string, to?: string) => {
    if (from && to) {
      return [`exchange:${from}:${to}:*`];
    }
    return ['exchange:*'];
  }
};

// CDN purge functions
export class CDNManager {
  private config: CDNConfig;

  constructor(config: CDNConfig = defaultCDNConfig) {
    this.config = config;
  }

  // Purge specific URLs
  async purgeUrls(urls: string[]): Promise<boolean> {
    if (!this.config.cloudflare.enabled) {
      return true; // Skip in development
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'X-Auth-Email': this.config.cloudflare.email,
            'X-Auth-Key': this.config.cloudflare.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ files: urls })
        }
      );

      const result = await response.json();
      return result.success;

    } catch (error) {
      console.error('CDN purge failed:', error);
      return false;
    }
  }

  // Purge by tags
  async purgeTags(tags: string[]): Promise<boolean> {
    if (!this.config.cloudflare.enabled) {
      return true;
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'X-Auth-Email': this.config.cloudflare.email,
            'X-Auth-Key': this.config.cloudflare.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tags })
        }
      );

      const result = await response.json();
      return result.success;

    } catch (error) {
      console.error('CDN tag purge failed:', error);
      return false;
    }
  }

  // Purge everything
  async purgeEverything(): Promise<boolean> {
    if (!this.config.cloudflare.enabled) {
      return true;
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'X-Auth-Email': this.config.cloudflare.email,
            'X-Auth-Key': this.config.cloudflare.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ purge_everything: true })
        }
      );

      const result = await response.json();
      return result.success;

    } catch (error) {
      console.error('CDN full purge failed:', error);
      return false;
    }
  }

  // Get cache analytics
  async getCacheAnalytics(since: string = '24h'): Promise<any> {
    if (!this.config.cloudflare.enabled) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zoneId}/analytics/dashboard?since=-${since}`,
        {
          headers: {
            'X-Auth-Email': this.config.cloudflare.email,
            'X-Auth-Key': this.config.cloudflare.apiKey
          }
        }
      );

      const result = await response.json();
      return result.result;

    } catch (error) {
      console.error('CDN analytics fetch failed:', error);
      return null;
    }
  }

  // Invalidate Malaysian specific caches
  async invalidateMalaysianCache(type: keyof typeof cacheInvalidation, ...args: any[]): Promise<boolean> {
    const patterns = cacheInvalidation[type](...args);
    
    // Convert patterns to actual URLs
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://yourdomain.com';
    const urls = patterns.map(pattern => `${baseUrl}/api/cache/${pattern}`);
    
    return this.purgeUrls(urls);
  }
}

// Utility functions for cache headers
export function getCacheHeaders(type: keyof typeof cacheHeaders): Record<string, string> {
  return { ...cacheHeaders[type] };
}

export function getMalaysianCacheRule(type: keyof typeof malaysianCacheRules) {
  return { ...malaysianCacheRules[type] };
}

// Cache key generators
export const cacheKeys = {
  tin: (tin: string) => `validation:tin:${tin}`,
  industryCode: (code: string) => `msic:code:${code}`,
  exchangeRate: (from: string, to: string, date?: string) => 
    `exchange:${from}:${to}${date ? `:${date}` : ''}`,
  organization: (orgId: string) => `org:${orgId}`,
  invoice: (invoiceId: string) => `invoice:${invoiceId}`,
  template: (orgId: string, templateId: string) => `template:${orgId}:${templateId}`,
  sstRate: (category: string) => `sst:rate:${category}`
};

export default {
  defaultCDNConfig,
  cacheHeaders,
  malaysianCacheRules,
  cacheInvalidation,
  CDNManager,
  getCacheHeaders,
  getMalaysianCacheRule,
  cacheKeys
};