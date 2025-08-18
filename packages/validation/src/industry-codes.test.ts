import { describe, it, expect } from 'vitest';
import { 
  getIndustryCode, 
  isB2cConsolidationAllowed,
  searchIndustryCodes,
  getIndustryCodesByCategory,
  getIndustryCodesBySection,
  getIndustryCategories,
  isSstApplicable,
  getIndustrySection,
  COMMON_INDUSTRY_CODES,
  INDUSTRY_SECTIONS
} from './industry-codes';

describe('Industry Codes', () => {
  describe('getIndustryCode', () => {
    it('should return the industry code object for valid codes', () => {
      const result = getIndustryCode('62010');
      expect(result).toBeDefined();
      expect(result?.code).toBe('62010');
      expect(result?.description).toBe('Computer programming activities');
      expect(result?.category).toBe('Information Technology');
      expect(result?.allowsB2cConsolidation).toBe(true);
    });

    it('should return undefined for unknown codes', () => {
      expect(getIndustryCode('UNKNOWN')).toBeUndefined();
      expect(getIndustryCode('')).toBeUndefined();
    });

    it('should handle prohibited industry codes', () => {
      const result = getIndustryCode('35101');
      expect(result).toBeDefined();
      expect(result?.allowsB2cConsolidation).toBe(false);
      expect(result?.notes).toBe('B2C consolidation not allowed');
    });

    it('should handle exact string matching', () => {
      expect(getIndustryCode('47')).toBeUndefined(); // This code doesn't exist in COMMON_INDUSTRY_CODES
      expect(getIndustryCode('47190')).toBeDefined(); // This exists
    });
  });

  describe('isB2cConsolidationAllowed', () => {
    describe('Prohibited Industries', () => {
      it('should reject electric power industries', () => {
        const electricPowerCodes = ['35101', '35102', '35103'];
        
        electricPowerCodes.forEach(code => {
          const result = isB2cConsolidationAllowed(code);
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('consolidation not');
        });
      });

      it('should reject water services', () => {
        const waterCodes = ['36000', '37000'];
        
        waterCodes.forEach(code => {
          const result = isB2cConsolidationAllowed(code);
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('consolidation not');
        });
      });

      it('should reject telecommunications', () => {
        const result = isB2cConsolidationAllowed('61');
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('consolidation not');
      });

      it('should reject parking and toll services', () => {
        const transportCodes = ['52211', '52212'];
        
        transportCodes.forEach(code => {
          const result = isB2cConsolidationAllowed(code);
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('consolidation not');
        });
      });

      it('should reject public administration', () => {
        const result = isB2cConsolidationAllowed('84');
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('consolidation not');
      });
    });

    describe('Allowed Industries with Restrictions', () => {
      it('should allow retail trade with restrictions', () => {
        const result = isB2cConsolidationAllowed('47190');
        
        expect(result.allowed).toBe(true);
        expect(result.restrictions).toBeDefined();
        if (result.restrictions) {
          expect(result.restrictions.some(r => r.includes('RM50,000'))).toBe(true);
        }
      });

      it('should allow food and beverage services with restrictions', () => {
        const result = isB2cConsolidationAllowed('56101');
        
        expect(result.allowed).toBe(true);
        expect(result.restrictions).toBeDefined();
        if (result.restrictions) {
          expect(result.restrictions.some(r => r.includes('200 transactions'))).toBe(true);
        }
      });
    });

    describe('Allowed Industries', () => {
      it('should allow professional services', () => {
        const professionalCodes = ['62010', '69100', '70100'];
        
        professionalCodes.forEach(code => {
          const result = isB2cConsolidationAllowed(code);
          expect(result.allowed).toBe(true);
        });
      });

      it('should allow manufacturing', () => {
        const result = isB2cConsolidationAllowed('10790');
        expect(result.allowed).toBe(true);
      });

      it('should allow construction', () => {
        const constructionCodes = ['41000', '42100'];
        
        constructionCodes.forEach(code => {
          const result = isB2cConsolidationAllowed(code);
          expect(result.allowed).toBe(true);
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle unknown industry codes with caution', () => {
        const result = isB2cConsolidationAllowed('UNKNOWN');
        
        expect(result.allowed).toBe(true);
        expect(result.reason).toContain('not found in database');
        expect(result.restrictions).toContain('Verify with LHDN if consolidation is permitted for your industry');
      });

      it('should handle empty string', () => {
        const result = isB2cConsolidationAllowed('');
        
        expect(result.allowed).toBe(true);
        expect(result.reason).toContain('not found in database');
      });
    });
  });

  describe('searchIndustryCodes', () => {
    it('should search by code', () => {
      const results = searchIndustryCodes('62010');
      expect(results).toHaveLength(1);
      expect(results[0].code).toBe('62010');
    });

    it('should search by description', () => {
      const results = searchIndustryCodes('computer');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.description.toLowerCase().includes('computer'))).toBe(true);
    });

    it('should search by category', () => {
      const results = searchIndustryCodes('information technology');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.category.toLowerCase().includes('information technology'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const results1 = searchIndustryCodes('COMPUTER');
      const results2 = searchIndustryCodes('computer');
      expect(results1).toEqual(results2);
    });

    it('should return empty array for no matches', () => {
      const results = searchIndustryCodes('NONEXISTENT');
      expect(results).toEqual([]);
    });
  });

  describe('getIndustryCodesByCategory', () => {
    it('should return codes for valid category', () => {
      const results = getIndustryCodesByCategory('Information Technology');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.category === 'Information Technology')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const results = getIndustryCodesByCategory('Unknown Category');
      expect(results).toEqual([]);
    });

    it('should handle professional services category', () => {
      const results = getIndustryCodesByCategory('Professional Services');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.category === 'Professional Services')).toBe(true);
    });
  });

  describe('getIndustryCodesBySection', () => {
    it('should return codes for valid section', () => {
      const results = getIndustryCodesBySection('J');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.section === 'J')).toBe(true);
    });

    it('should return empty array for unknown section', () => {
      const results = getIndustryCodesBySection('Z');
      expect(results).toEqual([]);
    });

    it('should handle utilities section', () => {
      const results = getIndustryCodesBySection('D');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.category === 'Utilities')).toBe(true);
    });
  });

  describe('getIndustryCategories', () => {
    it('should return unique categories', () => {
      const categories = getIndustryCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(new Set(categories).size).toBe(categories.length); // No duplicates
    });

    it('should return sorted categories', () => {
      const categories = getIndustryCategories();
      const sorted = [...categories].sort();
      expect(categories).toEqual(sorted);
    });

    it('should include expected categories', () => {
      const categories = getIndustryCategories();
      expect(categories).toContain('Information Technology');
      expect(categories).toContain('Professional Services');
      expect(categories).toContain('Utilities');
    });
  });

  describe('isSstApplicable', () => {
    it('should return true for SST applicable industries', () => {
      expect(isSstApplicable('62010')).toBe(true);
      expect(isSstApplicable('69100')).toBe(true);
      expect(isSstApplicable('61')).toBe(true);
    });

    it('should return false for non-SST industries', () => {
      expect(isSstApplicable('47190')).toBe(false);
      expect(isSstApplicable('56101')).toBe(false);
      expect(isSstApplicable('35101')).toBe(false);
    });

    it('should return false for unknown codes', () => {
      expect(isSstApplicable('UNKNOWN')).toBe(false);
      expect(isSstApplicable('')).toBe(false);
    });
  });

  describe('getIndustrySection', () => {
    it('should return section for valid code', () => {
      const section = getIndustrySection('J');
      expect(section).toBeDefined();
      expect(section?.code).toBe('J');
      expect(section?.title).toBe('Information and Communication');
    });

    it('should return undefined for unknown section', () => {
      expect(getIndustrySection('Z')).toBeUndefined();
      expect(getIndustrySection('')).toBeUndefined();
    });

    it('should handle all defined sections', () => {
      const sectionCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'];
      
      sectionCodes.forEach(code => {
        const section = getIndustrySection(code);
        expect(section).toBeDefined();
        expect(section?.code).toBe(code);
      });
    });
  });

  describe('Industry Code Constants', () => {
    it('should have required prohibited industries', () => {
      const prohibitedCodes = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
      
      prohibitedCodes.forEach(code => {
        const industry = COMMON_INDUSTRY_CODES.find(ic => ic.code === code);
        expect(industry).toBeDefined();
        expect(industry?.allowsB2cConsolidation).toBe(false);
      });
    });

    it('should have proper industry structure', () => {
      COMMON_INDUSTRY_CODES.forEach(industry => {
        expect(industry).toHaveProperty('code');
        expect(industry).toHaveProperty('description');
        expect(industry).toHaveProperty('category');
        expect(industry).toHaveProperty('section');
        expect(industry).toHaveProperty('allowsB2cConsolidation');
        expect(industry).toHaveProperty('sstApplicable');
        
        expect(typeof industry.code).toBe('string');
        expect(typeof industry.description).toBe('string');
        expect(typeof industry.category).toBe('string');
        expect(typeof industry.section).toBe('string');
        expect(typeof industry.allowsB2cConsolidation).toBe('boolean');
        expect(typeof industry.sstApplicable).toBe('boolean');
      });
    });

    it('should have all sections defined', () => {
      expect(INDUSTRY_SECTIONS).toHaveLength(21); // A through U
      
      INDUSTRY_SECTIONS.forEach(section => {
        expect(section).toHaveProperty('code');
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('description');
        expect(section.code).toMatch(/^[A-U]$/);
      });
    });
  });

  describe('Performance Testing', () => {
    it('should handle large numbers of searches efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        searchIndustryCodes(`${i % 100}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 searches in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle consolidation checks efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        isB2cConsolidationAllowed(`${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 checks in under 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Real-world Malaysian Industry Codes', () => {
    it('should handle real MSIC 2008 codes from our database', () => {
      const realCodes = COMMON_INDUSTRY_CODES.map(ic => ic.code);
      
      realCodes.forEach(code => {
        const result = getIndustryCode(code);
        expect(result).toBeDefined();
        expect(result?.code).toBe(code);
      });
    });

    it('should properly categorize Malaysian utility companies', () => {
      const utilityCodes = ['35101', '35102', '35103', '36000'];
      
      utilityCodes.forEach(code => {
        const result = isB2cConsolidationAllowed(code);
        expect(result.allowed).toBe(false);
      });
    });

    it('should handle Malaysian telco industry codes', () => {
      const result = isB2cConsolidationAllowed('61');
      expect(result.allowed).toBe(false);
    });

    it('should handle professional services correctly', () => {
      const professionalCodes = ['69100', '69200', '70100', '71100', '71200'];
      
      professionalCodes.forEach(code => {
        const industry = getIndustryCode(code);
        expect(industry).toBeDefined();
        expect(industry?.category).toBe('Professional Services');
        expect(industry?.allowsB2cConsolidation).toBe(true);
        expect(industry?.sstApplicable).toBe(true);
      });
    });
  });

  describe('Regulatory Compliance', () => {
    it('should comply with LHDN e-Invoice guidelines for prohibited industries', () => {
      const lhdnProhibited = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
      
      lhdnProhibited.forEach(code => {
        const result = isB2cConsolidationAllowed(code);
        expect(result.allowed).toBe(false);
      });
    });

    it('should provide appropriate guidance for conditional industries', () => {
      const retailResult = isB2cConsolidationAllowed('47190');
      const fbResult = isB2cConsolidationAllowed('56101');
      
      expect(retailResult.restrictions).toBeDefined();
      expect(fbResult.restrictions).toBeDefined();
      
      if (retailResult.restrictions) {
        expect(retailResult.restrictions.some(r => r.includes('RM50,000'))).toBe(true);
      }
      
      if (fbResult.restrictions) {
        expect(fbResult.restrictions.some(r => r.includes('200 transactions'))).toBe(true);
      }
    });

    it('should provide LHDN verification guidance for unknown codes', () => {
      const result = isB2cConsolidationAllowed('UNKNOWN_CODE');
      
      expect(result.restrictions).toContain('Verify with LHDN if consolidation is permitted for your industry');
    });
  });
});