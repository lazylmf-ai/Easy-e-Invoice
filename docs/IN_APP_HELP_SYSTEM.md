# In-App Help System Design

## Overview

The Easy e-Invoice in-app help system provides contextual assistance, interactive tours, and guided workflows to ensure users can effectively use the platform and maintain Malaysian e-Invoice compliance.

## Table of Contents

1. [Help System Components](#help-system-components)
2. [Contextual Help Framework](#contextual-help-framework)
3. [Interactive Tours](#interactive-tours)
4. [Progressive Disclosure](#progressive-disclosure)
5. [Help Widget Implementation](#help-widget-implementation)
6. [Content Management](#content-management)
7. [Accessibility & Localization](#accessibility--localization)

---

## Help System Components

### 1. Help Widget (Persistent)

**Location**: Bottom-right corner of screen
**Visibility**: Always visible, collapsible

```javascript
// Help Widget Component Structure
const HelpWidget = {
  // Minimized state
  minimized: {
    icon: "❓", // Question mark icon
    color: "#4F46E5", // Primary brand color
    tooltip: "Need help? Click for assistance"
  },
  
  // Expanded state
  expanded: {
    searchBar: "Search help articles...",
    quickActions: [
      "Create Invoice",
      "Add Customer", 
      "Import Data",
      "Contact Support"
    ],
    recentArticles: ["Recently viewed help topics"],
    liveChat: "Chat with Support (Available 9-6 GMT+8)"
  }
}
```

### 2. Contextual Help Tooltips

**Trigger**: Hover or click on help icons (ⓘ)
**Content**: Concise explanations with "Learn More" links

```html
<!-- Example Tooltip Structure -->
<div class="help-tooltip">
  <h4>TIN Number</h4>
  <p>Malaysian Tax Identification Number. Format: C + 10 digits for companies.</p>
  <div class="tooltip-actions">
    <a href="/help/tin-validation">Learn More</a>
    <button onclick="showTINExamples()">See Examples</button>
  </div>
</div>
```

### 3. Inline Validation Messages

**Purpose**: Real-time guidance during data entry
**Style**: Contextual colors (green/yellow/red) with actionable advice

```javascript
const validationMessages = {
  tin: {
    invalid: {
      message: "TIN format is incorrect",
      help: "Companies must use format: C + 10 digits (e.g., C1234567890)",
      action: "Show TIN format guide"
    },
    valid: {
      message: "✅ Valid TIN format",
      help: "Your TIN format meets Malaysian standards"
    }
  },
  industry: {
    invalid: {
      message: "Invalid industry code",
      help: "Use 5-digit MSIC 2008 codes only",
      action: "Browse industry codes"
    }
  }
}
```

### 4. Progressive Disclosure

**Implementation**: Show basic options first, reveal advanced features gradually

```javascript
const progressiveDisclosure = {
  invoice: {
    basic: [
      "Customer selection",
      "Invoice date", 
      "Line items",
      "Payment terms"
    ],
    advanced: [
      "Multi-currency",
      "Bulk line items",
      "Custom fields",
      "Approval workflow"
    ]
  }
}
```

---

## Contextual Help Framework

### Page-Level Help Content

Each major page has dedicated help content that adapts to user context:

#### Dashboard Help Content
```yaml
dashboard:
  welcome_message: "Welcome to Easy e-Invoice! Here's your business overview."
  quick_tips:
    - "Click 'Create Invoice' to start your first invoice"
    - "Your compliance score shows how well you meet Malaysian standards"
    - "Green metrics indicate good performance"
  widgets:
    total_invoices:
      tooltip: "Total number of invoices created in your organization"
      help_link: "/help/invoice-management"
    compliance_score:
      tooltip: "Average compliance score across all your invoices"
      help_link: "/help/malaysian-compliance"
    pending_payments:
      tooltip: "Total amount awaiting payment from customers"
      help_link: "/help/payment-tracking"
```

#### Invoice Creation Help Content
```yaml
invoice_creation:
  page_help: "Create Malaysian-compliant invoices with automatic validation"
  section_help:
    customer_selection:
      title: "Choose Your Customer"
      content: "Select existing customer or add new one. TIN is required for B2B invoices."
      tips:
        - "Use TIN search for quick customer lookup"
        - "Business customers need valid Malaysian TIN"
        - "Individual customers can use IC numbers"
    
    line_items:
      title: "Add Invoice Items"
      content: "Describe goods or services with quantities and pricing"
      tips:
        - "Clear descriptions help with compliance"
        - "SST rate is usually 6% for taxable items"
        - "Use 'Add Template' for frequently sold items"
    
    validation:
      title: "Compliance Validation"
      content: "Automatic check against Malaysian e-Invoice standards"
      tips:
        - "Aim for 90%+ compliance score"
        - "Red errors must be fixed before sending"
        - "Yellow warnings are recommendations"
```

### Field-Level Help Content

Specific guidance for individual form fields:

```yaml
fields:
  tin_number:
    label: "TIN Number"
    help: "Malaysian Tax Identification Number"
    placeholder: "C1234567890"
    formats:
      company: "C + 10 digits (e.g., C1234567890)"
      individual: "12 digits (e.g., 123456789012)" 
      government: "G + 10 digits (e.g., G1234567890)"
      nonprofit: "N + 10 digits (e.g., N1234567890)"
    validation:
      real_time: true
      error_messages:
        - "TIN format is incorrect for selected business type"
        - "TIN number already exists in system"
        - "Invalid characters in TIN number"
  
  industry_code:
    label: "Industry Code (MSIC 2008)"
    help: "5-digit classification code for your business activity"
    placeholder: "62010"
    search_enabled: true
    common_codes:
      - "62010: Computer Programming Activities"
      - "69201: Accounting, Auditing and Tax Services"
      - "46900: Non-specialized wholesale trade"
      - "47911: Retail sale via internet"
    
  sst_rate:
    label: "SST Rate"
    help: "Sales and Service Tax rate for this item"
    default: 6.0
    options:
      - value: 6.0
        label: "6% (Standard Rate)"
        description: "Most goods and services"
      - value: 0.0
        label: "0% (Zero-rated)"
        description: "Exports, some financial services"
      - value: null
        label: "Exempt"
        description: "Medical, education, basic food items"
```

---

## Interactive Tours

### First-Time User Tour

**Trigger**: First login after onboarding
**Duration**: 3-4 minutes
**Steps**: 8-10 guided steps

```javascript
const firstTimeTour = {
  id: "first-time-tour",
  title: "Welcome to Easy e-Invoice!",
  description: "Let's take a quick tour of your new invoicing platform",
  
  steps: [
    {
      target: ".dashboard-overview",
      title: "Your Dashboard",
      content: "This is your business overview. See key metrics and quick actions here.",
      position: "bottom"
    },
    {
      target: ".sidebar-invoices",
      title: "Invoice Management", 
      content: "Create, edit, and manage all your invoices from here.",
      position: "right"
    },
    {
      target: ".compliance-score",
      title: "Compliance Monitoring",
      content: "Track how well your invoices meet Malaysian standards. Aim for 90%+!",
      position: "left"
    },
    {
      target: ".create-invoice-btn",
      title: "Create Your First Invoice",
      content: "Ready to start? Click here to create your first Malaysian-compliant invoice.",
      position: "bottom",
      action: "highlight"
    }
  ],
  
  onComplete: {
    action: "show_congratulations",
    next_steps: [
      "Create your first invoice",
      "Add customers to your database", 
      "Set up invoice templates"
    ]
  }
}
```

### Feature-Specific Tours

#### Invoice Creation Tour
```javascript
const invoiceCreationTour = {
  id: "invoice-creation-tour",
  trigger: "click_create_invoice_first_time",
  
  steps: [
    {
      target: ".customer-selector",
      title: "Select Customer",
      content: "Choose existing customer or add new. Business customers need TIN numbers.",
      tips: ["Search by company name or TIN", "TIN validation happens automatically"]
    },
    {
      target: ".invoice-details",
      title: "Invoice Information", 
      content: "Invoice number is auto-generated. Set issue date and payment terms.",
      tips: ["Due date auto-calculated from payment terms", "Reference numbers help with tracking"]
    },
    {
      target: ".line-items",
      title: "Add Items/Services",
      content: "Describe what you're billing for. SST is calculated automatically.",
      tips: ["Clear descriptions improve compliance", "Use templates for common items"]
    },
    {
      target: ".validation-panel",
      title: "Compliance Check",
      content: "Real-time validation against Malaysian standards. Fix red errors before sending.",
      tips: ["90%+ score is excellent", "Hover over warnings for help"]
    }
  ]
}
```

#### Import Data Tour
```javascript
const importDataTour = {
  id: "import-data-tour",
  trigger: "navigate_to_import",
  
  steps: [
    {
      target: ".import-template-download",
      title: "Download Template",
      content: "Always use our CSV template to ensure correct format and required fields."
    },
    {
      target: ".file-upload-area",
      title: "Upload Your Data",
      content: "Drag and drop your CSV file here, or click to browse."
    },
    {
      target: ".field-mapping",
      title: "Map Your Fields",
      content: "Verify that your CSV columns match our system fields."
    },
    {
      target: ".preview-data",
      title: "Preview & Validate",
      content: "Review first 5 records and check for any formatting issues."
    },
    {
      target: ".import-results",
      title: "Import Results",
      content: "See what was imported successfully and what needs attention."
    }
  ]
}
```

---

## Progressive Disclosure

### Information Hierarchy

**Level 1: Essential Information**
- Always visible, core functionality
- Invoice basics: customer, date, amount
- Primary actions: save, send, validate

**Level 2: Important Options**  
- Visible by default, can be collapsed
- Payment terms, references, notes
- Advanced line item options

**Level 3: Advanced Features**
- Hidden by default, revealed on demand
- Multi-currency settings, custom fields
- Bulk operations, API integrations

```javascript
const disclosureLevels = {
  invoice_form: {
    level1: {
      always_visible: [
        "customer_selection",
        "issue_date", 
        "line_items",
        "total_amount"
      ]
    },
    level2: {
      collapsible_sections: [
        "payment_terms",
        "references", 
        "notes_terms",
        "attachments"
      ]
    },
    level3: {
      advanced_options: [
        "multi_currency",
        "custom_fields",
        "approval_workflow",
        "api_settings"
      ]
    }
  }
}
```

### Adaptive Interface

Show features based on user experience level and usage patterns:

```javascript
const adaptiveInterface = {
  new_user: {
    show: ["basic_features", "guided_tours", "contextual_tips"],
    hide: ["advanced_options", "bulk_operations"]
  },
  experienced_user: {
    show: ["all_features", "keyboard_shortcuts", "advanced_options"],
    hide: ["basic_tutorials", "excessive_tooltips"]
  },
  power_user: {
    show: ["all_features", "api_docs", "customization_options"],
    preferences: ["minimal_help", "keyboard_navigation"]
  }
}
```

---

## Help Widget Implementation

### Widget States and Behavior

```javascript
const helpWidget = {
  // Minimized floating button
  minimized: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    size: "56px",
    icon: "❓",
    pulse: true, // Subtle animation for first-time users
    tooltip: "Need help? Click for assistance"
  },
  
  // Expanded help panel
  expanded: {
    width: "400px",
    height: "600px",
    position: "bottom-right",
    sections: [
      "search",
      "quick_actions", 
      "contextual_help",
      "recent_articles",
      "contact_support"
    ]
  },
  
  // Full-screen help overlay
  fullscreen: {
    trigger: "complex_help_content",
    features: ["step_by_step_guides", "video_tutorials", "documentation"]
  }
}
```

### Search Functionality

```javascript
const helpSearch = {
  placeholder: "Search help articles, features, or ask a question...",
  
  search_categories: [
    "getting_started",
    "invoice_creation", 
    "customer_management",
    "malaysian_compliance",
    "troubleshooting"
  ],
  
  intelligent_suggestions: {
    based_on: ["current_page", "user_actions", "common_issues"],
    examples: [
      "How to add SST to invoice",
      "TIN number format for companies", 
      "Import customers from Excel",
      "Why is my compliance score low?"
    ]
  },
  
  search_results: {
    format: [
      "help_articles",
      "video_tutorials", 
      "feature_documentation",
      "contact_options"
    ],
    ranking: "relevance + user_behavior + content_freshness"
  }
}
```

### Quick Actions Menu

```javascript
const quickActions = {
  primary_actions: [
    {
      label: "Create New Invoice",
      icon: "➕",
      action: "navigate_to_invoice_creation",
      help: "Start creating a new Malaysian-compliant invoice"
    },
    {
      label: "Add Customer",
      icon: "👤",
      action: "open_customer_form",
      help: "Add a new customer to your database"
    },
    {
      label: "Import Data", 
      icon: "📁",
      action: "navigate_to_import",
      help: "Import customers or invoices from CSV file"
    },
    {
      label: "Contact Support",
      icon: "💬", 
      action: "open_support_chat",
      help: "Chat with our support team (9 AM - 6 PM GMT+8)"
    }
  ],
  
  contextual_actions: {
    // Actions that appear based on current page
    invoice_page: [
      "Validate This Invoice",
      "Send Invoice to Customer",
      "Export as PDF"
    ],
    customer_page: [
      "Create Invoice for This Customer",
      "Edit Customer Details",
      "View Payment History"
    ]
  }
}
```

---

## Content Management

### Help Content Structure

```yaml
help_content:
  articles:
    getting_started:
      - id: "account-setup"
        title: "Setting Up Your Account"
        tags: ["onboarding", "account", "setup"]
        difficulty: "beginner"
        estimated_time: "5 minutes"
        
      - id: "first-invoice"
        title: "Creating Your First Invoice"
        tags: ["invoice", "creation", "tutorial"]
        difficulty: "beginner"
        estimated_time: "10 minutes"
    
    malaysian_compliance:
      - id: "tin-validation"
        title: "Understanding TIN Number Formats"
        tags: ["TIN", "validation", "malaysia"]
        difficulty: "intermediate"
        
      - id: "sst-calculation"
        title: "SST Calculation and Compliance"
        tags: ["SST", "tax", "calculation"]
        difficulty: "intermediate"
  
  tutorials:
    video_guides:
      - id: "platform-overview"
        title: "Easy e-Invoice Platform Overview"
        duration: "8 minutes"
        
      - id: "invoice-creation-walkthrough"
        title: "Step-by-Step Invoice Creation"
        duration: "12 minutes"
    
    interactive_guides:
      - id: "onboarding-wizard"
        title: "Interactive Setup Wizard"
        type: "step_by_step"
        
      - id: "feature-tour"
        title: "Platform Feature Tour"
        type: "guided_tour"
```

### Content Personalization

```javascript
const personalizedContent = {
  user_segments: {
    new_user: {
      priority_content: [
        "getting_started_guide",
        "first_invoice_tutorial", 
        "basic_navigation"
      ],
      hide_content: [
        "advanced_features",
        "api_documentation"
      ]
    },
    
    sme_owner: {
      priority_content: [
        "compliance_monitoring",
        "financial_reports",
        "customer_management"
      ]
    },
    
    accountant: {
      priority_content: [
        "bulk_operations",
        "tax_reporting",
        "audit_trails"
      ]
    }
  },
  
  contextual_content: {
    page_based: "Show relevant help for current page",
    action_based: "Help for current user action",
    error_based: "Specific help when errors occur"
  }
}
```

### Multi-language Support

```yaml
localization:
  supported_languages:
    - code: "en"
      name: "English"
      default: true
    - code: "ms"
      name: "Bahasa Malaysia"
      
  content_structure:
    help_articles:
      en:
        title: "Getting Started with Easy e-Invoice"
        content: "Welcome to Easy e-Invoice..."
      ms:
        title: "Memulakan dengan Easy e-Invoice"
        content: "Selamat datang ke Easy e-Invoice..."
    
    ui_elements:
      help_widget:
        en:
          tooltip: "Need help? Click for assistance"
          search_placeholder: "Search help articles..."
        ms:
          tooltip: "Perlukan bantuan? Klik untuk mendapatkan bantuan"
          search_placeholder: "Cari artikel bantuan..."
```

---

## Accessibility & Localization

### Accessibility Features

```javascript
const accessibility = {
  keyboard_navigation: {
    help_widget: "Tab to focus, Enter to open, Escape to close",
    tour_steps: "Arrow keys to navigate, Space to advance",
    search: "Ctrl+/ to focus search from anywhere"
  },
  
  screen_reader_support: {
    aria_labels: "Descriptive labels for all interactive elements",
    live_regions: "Announce dynamic content changes",
    semantic_html: "Proper heading hierarchy and landmarks"
  },
  
  visual_accessibility: {
    high_contrast: "Support for high contrast mode",
    font_scaling: "Respect user font size preferences", 
    color_blind: "Don't rely solely on color for meaning"
  },
  
  cognitive_accessibility: {
    clear_language: "Simple, jargon-free explanations",
    consistent_layout: "Predictable interface patterns",
    progress_indicators: "Show completion status in tours"
  }
}
```

### Implementation Guidelines

**1. Help Widget Integration**
```javascript
// React component structure
const HelpWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const currentPage = useCurrentPage();
  const contextualHelp = useContextualHelp(currentPage);
  
  return (
    <FloatingHelpWidget
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      contextualContent={contextualHelp}
      searchQuery={searchQuery}
      onSearch={setSearchQuery}
    />
  );
};
```

**2. Contextual Help Hooks**
```javascript
// Custom hook for contextual help
const useContextualHelp = (currentPage) => {
  const [helpContent, setHelpContent] = useState(null);
  
  useEffect(() => {
    const loadHelpContent = async () => {
      const content = await fetchHelpContent(currentPage);
      setHelpContent(content);
    };
    
    loadHelpContent();
  }, [currentPage]);
  
  return helpContent;
};
```

**3. Tour Implementation**
```javascript
// Tour system integration
const useTourSystem = () => {
  const [activeTour, setActiveTour] = useState(null);
  
  const startTour = (tourId) => {
    const tour = getTourConfiguration(tourId);
    setActiveTour(tour);
  };
  
  const completeTour = (tourId) => {
    recordTourCompletion(tourId);
    setActiveTour(null);
  };
  
  return { activeTour, startTour, completeTour };
};
```

---

This comprehensive help system design ensures users can successfully navigate and utilize Easy e-Invoice while maintaining Malaysian e-Invoice compliance. The system adapts to user needs and provides multiple pathways to assistance, from contextual tooltips to comprehensive guided tours.