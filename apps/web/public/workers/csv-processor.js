// Web Worker for CSV processing
// This runs in a separate thread to avoid blocking the main UI

self.onmessage = function(e) {
  const { csvData } = e.data;
  
  try {
    // Parse CSV data
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const results = [];
    const errors = [];
    
    // Process each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = parseCSVLine(line);
        
        if (values.length !== headers.length) {
          errors.push({
            line: i + 1,
            error: `Column count mismatch. Expected ${headers.length}, got ${values.length}`,
            data: line
          });
          continue;
        }
        
        // Create record object
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index];
        });
        
        // Basic validation for Malaysian invoice data
        const validationResult = validateMalaysianInvoiceRecord(record);
        
        if (validationResult.isValid) {
          results.push({
            lineNumber: i + 1,
            data: record,
            warnings: validationResult.warnings
          });
        } else {
          errors.push({
            line: i + 1,
            error: validationResult.error,
            data: record
          });
        }
        
        // Report progress every 100 lines
        if (i % 100 === 0) {
          self.postMessage({
            type: 'progress',
            processed: i,
            total: lines.length - 1
          });
        }
        
      } catch (error) {
        errors.push({
          line: i + 1,
          error: error.message,
          data: line
        });
      }
    }
    
    // Send final results
    self.postMessage({
      type: 'complete',
      results: {
        success: results,
        errors: errors,
        summary: {
          totalLines: lines.length - 1,
          successCount: results.length,
          errorCount: errors.length,
          successRate: ((results.length / (lines.length - 1)) * 100).toFixed(2)
        }
      }
    });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};

// Parse CSV line with proper quote handling
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        // Escaped quote
        current += char;
        i++; // Skip next quote
      } else {
        inQuotes = false;
        quoteChar = '';
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last value
  values.push(current.trim());
  
  return values;
}

// Validate Malaysian invoice record
function validateMalaysianInvoiceRecord(record) {
  const warnings = [];
  
  // Required fields for Malaysian e-Invoice
  const requiredFields = [
    'invoiceNumber',
    'issueDate',
    'currency',
    'grandTotal'
  ];
  
  // Check required fields
  for (const field of requiredFields) {
    if (!record[field] || record[field].toString().trim() === '') {
      return {
        isValid: false,
        error: `Missing required field: ${field}`
      };
    }
  }
  
  // Validate invoice number format
  if (record.invoiceNumber) {
    const invoiceNumber = record.invoiceNumber.toString().trim();
    if (invoiceNumber.length < 3 || invoiceNumber.length > 50) {
      return {
        isValid: false,
        error: 'Invoice number must be between 3 and 50 characters'
      };
    }
  }
  
  // Validate date format
  if (record.issueDate) {
    const dateStr = record.issueDate.toString().trim();
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        error: 'Invalid issue date format. Use YYYY-MM-DD or DD/MM/YYYY'
      };
    }
  }
  
  // Validate currency
  if (record.currency) {
    const currency = record.currency.toString().trim().toUpperCase();
    const validCurrencies = ['MYR', 'USD', 'EUR', 'SGD', 'CNY', 'JPY', 'GBP'];
    if (!validCurrencies.includes(currency)) {
      warnings.push(`Uncommon currency: ${currency}. Common currencies are: ${validCurrencies.join(', ')}`);
    }
  }
  
  // Validate grand total
  if (record.grandTotal) {
    const total = parseFloat(record.grandTotal.toString().replace(/,/g, ''));
    if (isNaN(total)) {
      return {
        isValid: false,
        error: 'Grand total must be a valid number'
      };
    }
    
    if (total < 0) {
      return {
        isValid: false,
        error: 'Grand total cannot be negative'
      };
    }
    
    if (total > 999999999.99) {
      warnings.push('Very large invoice amount detected');
    }
  }
  
  // Validate TIN if present
  if (record.tin || record.buyerTin || record.supplierTin) {
    const tinField = record.tin || record.buyerTin || record.supplierTin;
    const tin = tinField.toString().trim();
    
    // Malaysian TIN validation patterns
    const corporateTin = /^C\d{10}$/;           // C1234567890
    const individualTin = /^\d{12}$/;           // 123456789012
    const governmentTin = /^G\d{10}$/;          // G1234567890
    const nonprofitTin = /^N\d{10}$/;           // N1234567890
    
    if (!corporateTin.test(tin) && !individualTin.test(tin) && 
        !governmentTin.test(tin) && !nonprofitTin.test(tin)) {
      warnings.push('TIN format does not match Malaysian standards');
    }
  }
  
  // Validate SST if present
  if (record.sstAmount || record.sstRate) {
    if (record.sstRate) {
      const sstRate = parseFloat(record.sstRate.toString().replace('%', ''));
      if (!isNaN(sstRate)) {
        if (sstRate !== 6) {
          warnings.push(`Unusual SST rate: ${sstRate}%. Standard Malaysian SST rate is 6%`);
        }
      }
    }
  }
  
  // Validate industry code if present
  if (record.industryCode || record.msicCode) {
    const code = (record.industryCode || record.msicCode).toString().trim();
    
    // Basic MSIC 2008 format validation
    if (!/^\d{5}$/.test(code)) {
      warnings.push('Industry code should be 5-digit MSIC 2008 code');
    }
  }
  
  return {
    isValid: true,
    warnings: warnings
  };
}

// Error handling
self.onerror = function(error) {
  self.postMessage({
    type: 'error',
    error: error.message || 'Unknown worker error'
  });
};