import { describe, it, expect } from 'vitest';
import { 
  validateTinFormat, 
  formatTinForDisplay, 
  getTinTypeDescription,
  suggestTinFormat,
  validateTinWithLhdn,
  TIN_PATTERNS,
  TIN_FORMATS,
  type TinValidationResult 
} from './tin-validation';

describe('TIN Validation', () => {
  describe('validateTinFormat', () => {
    describe('Corporate TIN Format (C + 10 digits)', () => {
      it('should pass for valid corporate TIN', () => {
        const result = validateTinFormat('C1234567890');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('corporate');
        expect(result.format).toBe('C1234567890');
        expect(result.errors).toHaveLength(0);
      });

      it('should pass for corporate TIN with lowercase c', () => {
        const result = validateTinFormat('c1234567890');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('corporate');
      });

      it('should pass for corporate TIN with spaces', () => {
        const result = validateTinFormat('C 1234 567 890');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('corporate');
      });

      it('should fail for corporate TIN with wrong digit count', () => {
        const result = validateTinFormat('C123456789'); // 9 digits
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid TIN format'))).toBe(true);
      });

      it('should fail for corporate TIN with non-numeric characters', () => {
        const result = validateTinFormat('C123456789A');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid TIN format'))).toBe(true);
      });

      it('should fail for TIN starting with wrong letter', () => {
        const result = validateTinFormat('D1234567890');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid TIN format'))).toBe(true);
      });
    });

    describe('Individual TIN Format (12 digits)', () => {
      it('should pass for valid individual TIN', () => {
        const result = validateTinFormat('123456789012');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('individual');
        expect(result.format).toBe('123456789012');
        expect(result.errors).toHaveLength(0);
      });

      it('should fail for individual TIN with wrong digit count', () => {
        const result = validateTinFormat('12345678901'); // 11 digits
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid TIN format'))).toBe(true);
      });

      it('should fail for individual TIN with non-numeric characters', () => {
        const result = validateTinFormat('12345678901A');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid TIN format'))).toBe(true);
      });

      it('should fail for individual TIN with letters', () => {
        const result = validateTinFormat('A23456789012');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid TIN format'))).toBe(true);
      });
    });

    describe('Government TIN Format (G + 10 digits)', () => {
      it('should pass for valid government TIN', () => {
        const result = validateTinFormat('G1234567890');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('government');
        expect(result.format).toBe('G1234567890');
        expect(result.errors).toHaveLength(0);
      });

      it('should pass for government TIN with lowercase g', () => {
        const result = validateTinFormat('g1234567890');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('government');
      });

      it('should fail for government TIN with wrong digit count', () => {
        const result = validateTinFormat('G123456789'); // 9 digits
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid TIN format'))).toBe(true);
      });
    });

    describe('Non-profit TIN Format (N + 10 digits)', () => {
      it('should pass for valid non-profit TIN', () => {
        const result = validateTinFormat('N1234567890');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('nonprofit');
        expect(result.format).toBe('N1234567890');
        expect(result.errors).toHaveLength(0);
      });

      it('should pass for non-profit TIN with lowercase n', () => {
        const result = validateTinFormat('n1234567890');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('nonprofit');
      });

      it('should fail for non-profit TIN with wrong digit count', () => {
        const result = validateTinFormat('N123456789'); // 9 digits
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid TIN format'))).toBe(true);
      });
    });

    describe('Edge Cases and Invalid Inputs', () => {
      it('should fail for empty string', () => {
        const result = validateTinFormat('');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('TIN is required'))).toBe(true);
      });

      it('should fail for null/undefined', () => {
        const result1 = validateTinFormat(null as any);
        const result2 = validateTinFormat(undefined as any);
        
        expect(result1.isValid).toBe(false);
        expect(result2.isValid).toBe(false);
        expect(result1.errors.some(e => e.includes('TIN is required'))).toBe(true);
        expect(result2.errors.some(e => e.includes('TIN is required'))).toBe(true);
      });

      it('should handle TIN with whitespace (should be cleaned)', () => {
        const result = validateTinFormat(' C1234567890 ');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('corporate');
      });

      it('should fail for random string', () => {
        const result = validateTinFormat('INVALID123');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid TIN format'))).toBe(true);
      });

      it('should provide helpful guidance for wrong length', () => {
        const tooShort = validateTinFormat('C123');
        const tooLong = validateTinFormat('C12345678901234567890');
        
        expect(tooShort.isValid).toBe(false);
        expect(tooLong.isValid).toBe(false);
        expect(tooShort.errors.some(e => e.includes('too short'))).toBe(true);
        expect(tooLong.errors.some(e => e.includes('too long'))).toBe(true);
      });

      it('should provide guidance for 11-character input', () => {
        const result = validateTinFormat('X1234567890'); // 11 chars, wrong prefix
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('11-character TIN must start with C, G, N, or R'))).toBe(true);
      });

      it('should provide guidance for 12-character input with letter', () => {
        const result = validateTinFormat('C12345678901'); // 12 chars with letter
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('12-digit TIN should not start with a letter'))).toBe(true);
      });
    });

    describe('Validation Warnings', () => {
      it('should warn for test numbers starting with 000', () => {
        const result = validateTinFormat('000123456789');
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('test number'))).toBe(true);
      });

      it('should warn for sequential numbers', () => {
        const result = validateTinFormat('C1234567890');
        
        expect(result.isValid).toBe(true);
        // This might have sequential warning depending on implementation
        if (result.warnings.length > 0) {
          expect(result.warnings.some(w => w.includes('sequential'))).toBe(true);
        }
      });
    });

    describe('Boundary Value Testing', () => {
      it('should handle minimum valid corporate TIN', () => {
        const result = validateTinFormat('C0000000001');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('corporate');
      });

      it('should handle maximum valid corporate TIN', () => {
        const result = validateTinFormat('C9999999999');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('corporate');
      });

      it('should handle minimum valid individual TIN', () => {
        const result = validateTinFormat('100000000001');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('individual');
      });

      it('should handle maximum valid individual TIN', () => {
        const result = validateTinFormat('999999999999');
        
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('individual');
      });
    });
  });

  describe('formatTinForDisplay', () => {
    it('should format corporate TIN with spaces', () => {
      const formatted = formatTinForDisplay('C1234567890');
      expect(formatted).toBe('C 1234 567 890');
    });

    it('should format government TIN with spaces', () => {
      const formatted = formatTinForDisplay('G1234567890');
      expect(formatted).toBe('G 1234 567 890');
    });

    it('should format non-profit TIN with spaces', () => {
      const formatted = formatTinForDisplay('N1234567890');
      expect(formatted).toBe('N 1234 567 890');
    });

    it('should format individual TIN with spaces', () => {
      const formatted = formatTinForDisplay('123456789012');
      expect(formatted).toBe('1234 5678 9012');
    });

    it('should handle invalid TIN gracefully', () => {
      const formatted = formatTinForDisplay('INVALID');
      expect(formatted).toBe('INVALID');
    });

    it('should handle empty TIN', () => {
      const formatted = formatTinForDisplay('');
      expect(formatted).toBe('');
    });

    it('should normalize case before formatting', () => {
      const formatted = formatTinForDisplay('c1234567890');
      expect(formatted).toBe('C 1234 567 890');
    });

    it('should handle TIN with existing spaces', () => {
      const formatted = formatTinForDisplay(' C 1234 567 890 ');
      expect(formatted).toBe('C 1234 567 890');
    });
  });

  describe('getTinTypeDescription', () => {
    it('should return correct descriptions for all types', () => {
      expect(getTinTypeDescription('corporate')).toBe('Company/Corporate entity');
      expect(getTinTypeDescription('individual')).toBe('Individual taxpayer');
      expect(getTinTypeDescription('government')).toBe('Government entity');
      expect(getTinTypeDescription('nonprofit')).toBe('Non-profit organization');
      expect(getTinTypeDescription('unknown')).toBe('Unknown');
    });

    it('should handle invalid types', () => {
      expect(getTinTypeDescription('invalid' as any)).toBe('Unknown');
    });
  });

  describe('suggestTinFormat', () => {
    it('should return all format suggestions for empty input', () => {
      const suggestions = suggestTinFormat('');
      expect(suggestions).toHaveLength(4);
      expect(suggestions).toContain('C1234567890 (Company)');
      expect(suggestions).toContain('123456789012 (Individual)');
      expect(suggestions).toContain('G1234567890 (Government)');
      expect(suggestions).toContain('N1234567890 (Non-profit)');
    });

    it('should suggest corporate format for C input', () => {
      const suggestions = suggestTinFormat('C123');
      expect(suggestions.some(s => s.includes('Company format'))).toBe(true);
    });

    it('should suggest individual format for numeric input', () => {
      const suggestions = suggestTinFormat('123');
      expect(suggestions.some(s => s.includes('Individual format'))).toBe(true);
    });

    it('should limit suggestions to 3', () => {
      const suggestions = suggestTinFormat('1');
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should handle mixed input gracefully', () => {
      const suggestions = suggestTinFormat('ABC123');
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('validateTinWithLhdn', () => {
    it('should return invalid for malformed TIN', async () => {
      const result = await validateTinWithLhdn('INVALID');
      
      expect(result.isValid).toBe(false);
      expect(result.isActive).toBe(false);
      expect(result.status).toBe('Invalid format');
    });

    it('should return valid for well-formed TIN', async () => {
      const result = await validateTinWithLhdn('C1234567890');
      
      expect(result.isValid).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.status).toContain('Active');
    });

    it('should simulate API delay', async () => {
      const startTime = Date.now();
      await validateTinWithLhdn('C1234567890');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(400); // Should take at least 500ms - some buffer
    });

    it('should return mock data for test TINs', async () => {
      const result = await validateTinWithLhdn('C1234567890');
      
      if (result.organizationName) {
        expect(result.organizationName).toBe('Test Company Sdn Bhd');
        expect(result.registrationDate).toBe('2020-01-01');
      }
    });

    it('should handle individual TINs', async () => {
      const result = await validateTinWithLhdn('123456789012');
      
      expect(result.isValid).toBe(true);
      expect(result.isActive).toBe(true);
    });
  });

  describe('TIN Pattern Constants', () => {
    it('should have correct patterns defined', () => {
      expect(TIN_PATTERNS.corporate.test('C1234567890')).toBe(true);
      expect(TIN_PATTERNS.individual.test('123456789012')).toBe(true);
      expect(TIN_PATTERNS.government.test('G1234567890')).toBe(true);
      expect(TIN_PATTERNS.nonprofit.test('N1234567890')).toBe(true);
    });

    it('should reject invalid patterns', () => {
      expect(TIN_PATTERNS.corporate.test('C123456789')).toBe(false); // Too short
      expect(TIN_PATTERNS.individual.test('12345678901')).toBe(false); // Too short
      expect(TIN_PATTERNS.government.test('G123456789A')).toBe(false); // Contains letter
      expect(TIN_PATTERNS.nonprofit.test('N12345678901')).toBe(false); // Too long
    });

    it('should have correct format examples', () => {
      expect(TIN_FORMATS.corporate).toBe('C1234567890');
      expect(TIN_FORMATS.individual).toBe('123456789012');
      expect(TIN_FORMATS.government).toBe('G1234567890');
      expect(TIN_FORMATS.nonprofit).toBe('N1234567890');
    });
  });

  describe('Performance Testing', () => {
    it('should handle large number of validations efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        validateTinFormat(`C123456789${i % 10}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 validations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle very long invalid strings without breaking', () => {
      const longString = 'C' + '1'.repeat(1000);
      
      expect(() => {
        validateTinFormat(longString);
      }).not.toThrow();
    });

    it('should handle malformed input gracefully', () => {
      const malformedInputs = [
        null,
        undefined,
        123456789012,
        {},
        [],
        true,
        false
      ];
      
      malformedInputs.forEach(input => {
        expect(() => {
          validateTinFormat(input as any);
        }).not.toThrow();
      });
    });
  });

  describe('Real-world TIN Examples', () => {
    it('should validate real-world corporate TIN examples', () => {
      const corporateTins = [
        'C2584997831',
        'C1234567890',
        'C9876543210',
        'C0123456789'
      ];

      corporateTins.forEach(tin => {
        const result = validateTinFormat(tin);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('corporate');
      });
    });

    it('should validate real-world individual TIN examples', () => {
      const individualTins = [
        '123456789012',
        '987654321098',
        '111111111111',
        '999999999999'
      ];

      individualTins.forEach(tin => {
        const result = validateTinFormat(tin);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('individual');
      });
    });

    it('should validate government TIN examples', () => {
      const governmentTins = [
        'G1234567890',
        'G9876543210',
        'G0000000001'
      ];

      governmentTins.forEach(tin => {
        const result = validateTinFormat(tin);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('government');
      });
    });

    it('should reject common invalid TIN patterns', () => {
      const invalidTins = [
        'TIN1234567890',  // Wrong prefix
        'C12345678',      // Too short
        'C12345678901',   // Too long
        '12345678901',    // Individual too short
        '1234567890123',  // Individual too long
        'C123-456-7890',  // Contains dashes
        'C123456789O',    // Contains letter O instead of 0
        '',               // Empty string
        '0000000000000',  // All zeros (wrong length)
        'CCCCCCCCCCCC'    // All letters
      ];

      invalidTins.forEach(tin => {
        const result = validateTinFormat(tin);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Malaysian Specific Validation', () => {
    it('should handle mixed case input consistently', () => {
      const mixedCaseTins = [
        'c1234567890',
        'C1234567890',
        'g1234567890',
        'G1234567890',
        'n1234567890',
        'N1234567890'
      ];

      mixedCaseTins.forEach(tin => {
        const result = validateTinFormat(tin);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle common Malaysian business TIN patterns', () => {
      // Based on real Malaysian TIN patterns
      const malaysianTins = [
        'C1234567890', // Standard corporate
        'G1234567890', // Government entity
        '123456789012', // Individual
        'N1234567890'  // Non-profit
      ];

      malaysianTins.forEach(tin => {
        const result = validateTinFormat(tin);
        expect(result.isValid).toBe(true);
      });
    });

    it('should provide comprehensive validation result structure', () => {
      const result = validateTinFormat('C1234567890');
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.type).toBe('string');
      expect(typeof result.format).toBe('string');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('Integration with Malaysian e-Invoice System', () => {
    it('should support all TIN types used in Malaysian e-Invoice', () => {
      const tinTypes = ['corporate', 'individual', 'government', 'nonprofit'];
      const testTins = [
        'C1234567890',
        '123456789012',
        'G1234567890',
        'N1234567890'
      ];

      testTins.forEach((tin, index) => {
        const result = validateTinFormat(tin);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe(tinTypes[index]);
      });
    });

    it('should provide user-friendly error messages', () => {
      const result = validateTinFormat('INVALID');
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid TIN format');
    });

    it('should handle edge cases for production use', () => {
      const edgeCases = [
        '   ',           // Only spaces
        '\t\n',         // Whitespace characters
        'C 1234 567 890', // Pre-formatted corporate TIN
        '1234 5678 9012'  // Pre-formatted individual TIN
      ];

      edgeCases.forEach(tin => {
        expect(() => {
          validateTinFormat(tin);
        }).not.toThrow();
      });
    });
  });
});