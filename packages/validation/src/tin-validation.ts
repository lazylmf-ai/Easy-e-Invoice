/**
 * Malaysian Tax Identification Number (TIN) validation utilities
 * 
 * TIN Formats in Malaysia:
 * 1. Corporate: C + 10 digits (e.g., C1234567890)
 * 2. Individual: 12 digits (e.g., 123456789012)
 * 3. Government: G + 10 digits (e.g., G1234567890)
 * 4. Non-profit: N + 10 digits (e.g., N1234567890)
 */

export interface TinValidationResult {
  isValid: boolean;
  type: 'corporate' | 'individual' | 'government' | 'nonprofit' | 'unknown';
  format: string;
  errors: string[];
  warnings: string[];
}

export const TIN_PATTERNS = {
  corporate: /^C\d{10}$/,
  individual: /^\d{12}$/,
  government: /^G\d{10}$/,
  nonprofit: /^N\d{10}$/
} as const;

export const TIN_FORMATS = {
  corporate: 'C1234567890',
  individual: '123456789012',
  government: 'G1234567890',
  nonprofit: 'N1234567890'
} as const;

/**
 * Validates a Malaysian TIN format
 */
export function validateTinFormat(tin: string): TinValidationResult {
  const result: TinValidationResult = {
    isValid: false,
    type: 'unknown',
    format: '',
    errors: [],
    warnings: []
  };

  // Basic validation
  if (!tin) {
    result.errors.push('TIN is required');
    return result;
  }

  // Remove spaces and convert to uppercase
  const cleanTin = tin.replace(/\s/g, '').toUpperCase();

  // Check each pattern
  if (TIN_PATTERNS.corporate.test(cleanTin)) {
    result.isValid = true;
    result.type = 'corporate';
    result.format = TIN_FORMATS.corporate;
  } else if (TIN_PATTERNS.individual.test(cleanTin)) {
    result.isValid = true;
    result.type = 'individual';
    result.format = TIN_FORMATS.individual;
  } else if (TIN_PATTERNS.government.test(cleanTin)) {
    result.isValid = true;
    result.type = 'government';
    result.format = TIN_FORMATS.government;
  } else if (TIN_PATTERNS.nonprofit.test(cleanTin)) {
    result.isValid = true;
    result.type = 'nonprofit';
    result.format = TIN_FORMATS.nonprofit;
  } else {
    result.errors.push('Invalid TIN format');
    
    // Provide specific guidance based on input
    if (cleanTin.length < 10) {
      result.errors.push('TIN is too short');
    } else if (cleanTin.length > 12) {
      result.errors.push('TIN is too long');
    } else if (cleanTin.length === 11 && !cleanTin.match(/^[CGNR]/)) {
      result.errors.push('11-character TIN must start with C, G, N, or R');
    } else if (cleanTin.length === 12 && cleanTin.match(/^[CGNR]/)) {
      result.errors.push('12-digit TIN should not start with a letter');
    }
  }

  // Add warnings for best practices
  if (result.isValid) {
    if (result.type === 'individual' && cleanTin.startsWith('000')) {
      result.warnings.push('TIN appears to be a test number');
    }
    
    // Check for sequential numbers (likely test data)
    if (isSequentialNumber(cleanTin)) {
      result.warnings.push('TIN appears to be sequential test data');
    }
  }

  return result;
}

/**
 * Validates TIN and checks against LHDN database (mock implementation)
 */
export function validateTinWithLhdn(tin: string): Promise<{
  isValid: boolean;
  isActive: boolean;
  organizationName?: string;
  registrationDate?: string;
  status: string;
}> {
  // This would integrate with LHDN API in production
  return new Promise((resolve) => {
    const formatValidation = validateTinFormat(tin);
    
    if (!formatValidation.isValid) {
      resolve({
        isValid: false,
        isActive: false,
        status: 'Invalid format'
      });
      return;
    }

    // Mock validation for demo purposes
    setTimeout(() => {
      const cleanTin = tin.replace(/\s/g, '').toUpperCase();
      
      // Mock some test TINs as valid
      const mockValidTins = [
        'C1234567890',
        'C9876543210',
        '123456789012',
        '987654321098'
      ];

      if (mockValidTins.includes(cleanTin)) {
        resolve({
          isValid: true,
          isActive: true,
          organizationName: 'Test Company Sdn Bhd',
          registrationDate: '2020-01-01',
          status: 'Active'
        });
      } else {
        resolve({
          isValid: true,
          isActive: true,
          status: 'Active (simulated)'
        });
      }
    }, 500); // Simulate API delay
  });
}

/**
 * Format TIN for display
 */
export function formatTinForDisplay(tin: string): string {
  const cleanTin = tin.replace(/\s/g, '').toUpperCase();
  
  if (TIN_PATTERNS.corporate.test(cleanTin) || 
      TIN_PATTERNS.government.test(cleanTin) || 
      TIN_PATTERNS.nonprofit.test(cleanTin)) {
    // C1234567890 -> C 1234 567 890
    return `${cleanTin[0]} ${cleanTin.slice(1, 5)} ${cleanTin.slice(5, 8)} ${cleanTin.slice(8)}`;
  }
  
  if (TIN_PATTERNS.individual.test(cleanTin)) {
    // 123456789012 -> 1234 5678 9012
    return `${cleanTin.slice(0, 4)} ${cleanTin.slice(4, 8)} ${cleanTin.slice(8)}`;
  }
  
  return cleanTin;
}

/**
 * Get TIN type description
 */
export function getTinTypeDescription(type: TinValidationResult['type']): string {
  switch (type) {
    case 'corporate':
      return 'Company/Corporate entity';
    case 'individual':
      return 'Individual taxpayer';
    case 'government':
      return 'Government entity';
    case 'nonprofit':
      return 'Non-profit organization';
    default:
      return 'Unknown';
  }
}

/**
 * Check if TIN consists of sequential numbers (likely test data)
 */
function isSequentialNumber(tin: string): boolean {
  const digits = tin.replace(/[^0-9]/g, '');
  
  if (digits.length < 4) return false;
  
  // Check for ascending sequence
  let isAscending = true;
  let isDescending = true;
  
  for (let i = 1; i < digits.length; i++) {
    const current = parseInt(digits[i]);
    const previous = parseInt(digits[i - 1]);
    
    if (current !== previous + 1) {
      isAscending = false;
    }
    if (current !== previous - 1) {
      isDescending = false;
    }
  }
  
  return isAscending || isDescending;
}

/**
 * Generate TIN suggestions for user input
 */
export function suggestTinFormat(input: string): string[] {
  const suggestions: string[] = [];
  const cleanInput = input.replace(/\s/g, '').toUpperCase();
  
  if (cleanInput.length === 0) {
    return [
      'C1234567890 (Company)',
      '123456789012 (Individual)',
      'G1234567890 (Government)',
      'N1234567890 (Non-profit)'
    ];
  }
  
  // If input looks like it could be corporate TIN
  if (cleanInput.length >= 1 && cleanInput.match(/^[C]/)) {
    suggestions.push(`${cleanInput.padEnd(11, '0').slice(0, 11)} (Company format)`);
  }
  
  // If input looks like individual TIN
  if (cleanInput.length >= 1 && cleanInput.match(/^\d/)) {
    suggestions.push(`${cleanInput.padEnd(12, '0').slice(0, 12)} (Individual format)`);
  }
  
  return suggestions.slice(0, 3); // Limit to 3 suggestions
}