#!/usr/bin/env node

// Performance Comparison Script for CI/CD Pipeline
// Compares current performance test results with baseline

const fs = require('fs');
const path = require('path');

const BASELINE_FILE = 'performance-baseline.json';
const CURRENT_RESULTS_FILE = 'performance-current.json';

// Performance regression thresholds (percentage increase allowed)
const REGRESSION_THRESHOLDS = {
  processingTime: 20, // 20% slower allowed
  memoryUsage: 30,    // 30% more memory allowed
  throughput: -10,    // 10% less throughput allowed (negative because lower is worse)
};

async function comparePerformance() {
  console.log('🔍 Malaysian e-Invoice Performance Regression Analysis');
  console.log('=' .repeat(60));

  try {
    // Load baseline performance data
    if (!fs.existsSync(BASELINE_FILE)) {
      console.log('⚠️  No baseline performance data found.');
      console.log('   Run: npm run test:performance:baseline to create baseline');
      process.exit(0);
    }

    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    
    // Load current performance data
    if (!fs.existsSync(CURRENT_RESULTS_FILE)) {
      console.log('⚠️  No current performance data found.');
      console.log('   Current test results should be saved to performance-current.json');
      process.exit(1);
    }

    const current = JSON.parse(fs.readFileSync(CURRENT_RESULTS_FILE, 'utf8'));

    // Compare performance metrics
    const comparison = compareMetrics(baseline, current);
    
    // Generate report
    generateReport(comparison);
    
    // Determine if regression is acceptable
    const hasRegression = checkForRegression(comparison);
    
    if (hasRegression) {
      console.log('\\n❌ Performance regression detected!');
      process.exit(1);
    } else {
      console.log('\\n✅ Performance regression check passed!');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error comparing performance:', error.message);
    process.exit(1);
  }
}

function compareMetrics(baseline, current) {
  const comparison = {
    csvImport: {},
    pdfGeneration: {},
    malaysianCompliance: {},
    overall: {},
  };

  // CSV Import comparison
  if (baseline.csvImport && current.csvImport) {
    comparison.csvImport = {
      processingTime: calculateChange(baseline.csvImport.processingTime, current.csvImport.processingTime),
      memoryUsage: calculateChange(baseline.csvImport.memoryUsage, current.csvImport.memoryUsage),
      throughput: calculateChange(baseline.csvImport.throughput, current.csvImport.throughput),
      successRate: calculateChange(baseline.csvImport.successRate, current.csvImport.successRate),
    };
  }

  // PDF Generation comparison
  if (baseline.pdfGeneration && current.pdfGeneration) {
    comparison.pdfGeneration = {
      generationTime: calculateChange(baseline.pdfGeneration.generationTime, current.pdfGeneration.generationTime),
      memoryUsage: calculateChange(baseline.pdfGeneration.memoryUsage, current.pdfGeneration.memoryUsage),
      throughput: calculateChange(baseline.pdfGeneration.throughput, current.pdfGeneration.throughput),
    };
  }

  // Malaysian Compliance comparison
  if (baseline.malaysianCompliance && current.malaysianCompliance) {
    comparison.malaysianCompliance = {
      tinValidationTime: calculateChange(baseline.malaysianCompliance.tinValidationTime, current.malaysianCompliance.tinValidationTime),
      sstCalculationTime: calculateChange(baseline.malaysianCompliance.sstCalculationTime, current.malaysianCompliance.sstCalculationTime),
      consolidationCheckTime: calculateChange(baseline.malaysianCompliance.consolidationCheckTime, current.malaysianCompliance.consolidationCheckTime),
      complianceScore: calculateChange(baseline.malaysianCompliance.complianceScore, current.malaysianCompliance.complianceScore),
    };
  }

  return comparison;
}

function calculateChange(baseline, current) {
  if (!baseline || !current) return { change: 0, status: 'unknown' };
  
  const change = ((current - baseline) / baseline) * 100;
  let status = 'same';
  
  if (Math.abs(change) < 1) {
    status = 'same';
  } else if (change > 0) {
    status = 'worse';
  } else {
    status = 'better';
  }

  return {
    baseline,
    current,
    change: Math.round(change * 100) / 100,
    status,
  };
}

function generateReport(comparison) {
  console.log('\\n📊 Performance Comparison Report');
  console.log('-'.repeat(40));

  // CSV Import Report
  if (comparison.csvImport && Object.keys(comparison.csvImport).length > 0) {
    console.log('\\n🗂️  CSV Import Performance:');
    reportMetric('Processing Time', comparison.csvImport.processingTime, 'ms', false);
    reportMetric('Memory Usage', comparison.csvImport.memoryUsage, 'MB', false);
    reportMetric('Throughput', comparison.csvImport.throughput, 'rows/sec', true);
    reportMetric('Success Rate', comparison.csvImport.successRate, '%', true);
  }

  // PDF Generation Report
  if (comparison.pdfGeneration && Object.keys(comparison.pdfGeneration).length > 0) {
    console.log('\\n📄 PDF Generation Performance:');
    reportMetric('Generation Time', comparison.pdfGeneration.generationTime, 'ms', false);
    reportMetric('Memory Usage', comparison.pdfGeneration.memoryUsage, 'MB', false);
    reportMetric('Throughput', comparison.pdfGeneration.throughput, 'PDFs/sec', true);
  }

  // Malaysian Compliance Report
  if (comparison.malaysianCompliance && Object.keys(comparison.malaysianCompliance).length > 0) {
    console.log('\\n🇲🇾 Malaysian Compliance Performance:');
    reportMetric('TIN Validation Time', comparison.malaysianCompliance.tinValidationTime, 'ms', false);
    reportMetric('SST Calculation Time', comparison.malaysianCompliance.sstCalculationTime, 'ms', false);
    reportMetric('Consolidation Check Time', comparison.malaysianCompliance.consolidationCheckTime, 'ms', false);
    reportMetric('Compliance Score', comparison.malaysianCompliance.complianceScore, '%', true);
  }
}

function reportMetric(name, metric, unit, higherIsBetter = false) {
  if (!metric || typeof metric.change === 'undefined') return;

  const { baseline, current, change, status } = metric;
  const arrow = getStatusArrow(status, higherIsBetter);
  const color = getStatusColor(status, higherIsBetter);

  console.log(`  ${name}: ${baseline}${unit} → ${current}${unit} ${arrow} ${color}${change > 0 ? '+' : ''}${change}%${color === '' ? '' : '\\x1b[0m'}`);
}

function getStatusArrow(status, higherIsBetter) {
  if (status === 'same') return '→';
  
  if (higherIsBetter) {
    return status === 'better' ? '↗️' : '↘️';
  } else {
    return status === 'better' ? '↘️' : '↗️';
  }
}

function getStatusColor(status, higherIsBetter) {
  if (status === 'same') return '';
  
  const isGood = (higherIsBetter && status === 'better') || (!higherIsBetter && status === 'worse');
  return isGood ? '\\x1b[32m' : '\\x1b[31m'; // Green for good, red for bad
}

function checkForRegression(comparison) {
  let hasRegression = false;
  const regressions = [];

  // Check CSV Import regressions
  if (comparison.csvImport) {
    if (comparison.csvImport.processingTime && comparison.csvImport.processingTime.change > REGRESSION_THRESHOLDS.processingTime) {
      regressions.push(`CSV Import processing time increased by ${comparison.csvImport.processingTime.change}%`);
      hasRegression = true;
    }
    
    if (comparison.csvImport.memoryUsage && comparison.csvImport.memoryUsage.change > REGRESSION_THRESHOLDS.memoryUsage) {
      regressions.push(`CSV Import memory usage increased by ${comparison.csvImport.memoryUsage.change}%`);
      hasRegression = true;
    }
    
    if (comparison.csvImport.throughput && comparison.csvImport.throughput.change < REGRESSION_THRESHOLDS.throughput) {
      regressions.push(`CSV Import throughput decreased by ${Math.abs(comparison.csvImport.throughput.change)}%`);
      hasRegression = true;
    }
  }

  // Check PDF Generation regressions
  if (comparison.pdfGeneration) {
    if (comparison.pdfGeneration.generationTime && comparison.pdfGeneration.generationTime.change > REGRESSION_THRESHOLDS.processingTime) {
      regressions.push(`PDF generation time increased by ${comparison.pdfGeneration.generationTime.change}%`);
      hasRegression = true;
    }
    
    if (comparison.pdfGeneration.memoryUsage && comparison.pdfGeneration.memoryUsage.change > REGRESSION_THRESHOLDS.memoryUsage) {
      regressions.push(`PDF generation memory usage increased by ${comparison.pdfGeneration.memoryUsage.change}%`);
      hasRegression = true;
    }
  }

  // Check Malaysian Compliance regressions
  if (comparison.malaysianCompliance) {
    if (comparison.malaysianCompliance.complianceScore && comparison.malaysianCompliance.complianceScore.change < -5) {
      regressions.push(`Malaysian compliance score decreased by ${Math.abs(comparison.malaysianCompliance.complianceScore.change)}%`);
      hasRegression = true;
    }
  }

  if (regressions.length > 0) {
    console.log('\\n🚨 Performance Regressions Detected:');
    regressions.forEach(regression => {
      console.log(`  ❌ ${regression}`);
    });
  }

  return hasRegression;
}

// Run the comparison
if (require.main === module) {
  comparePerformance();
}

module.exports = { comparePerformance };