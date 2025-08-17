import { z } from 'zod';
export declare const tinSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const sstRateSchema: z.ZodEffects<z.ZodNumber, number, number>;
export declare const currencySchema: z.ZodEnum<["MYR", "USD", "SGD", "EUR", "GBP"]>;
export declare const invoiceTypeSchema: z.ZodEnum<["01", "02", "03", "04"]>;
export declare const organizationSchema: z.ZodObject<{
    name: z.ZodString;
    brn: z.ZodOptional<z.ZodString>;
    tin: z.ZodEffects<z.ZodString, string, string>;
    sstNumber: z.ZodOptional<z.ZodString>;
    industryCode: z.ZodOptional<z.ZodString>;
    isSstRegistered: z.ZodDefault<z.ZodBoolean>;
    currency: z.ZodDefault<z.ZodEnum<["MYR", "USD", "SGD", "EUR", "GBP"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tin: string;
    isSstRegistered: boolean;
    currency: "MYR" | "USD" | "SGD" | "EUR" | "GBP";
    brn?: string | undefined;
    sstNumber?: string | undefined;
    industryCode?: string | undefined;
}, {
    name: string;
    tin: string;
    brn?: string | undefined;
    sstNumber?: string | undefined;
    industryCode?: string | undefined;
    isSstRegistered?: boolean | undefined;
    currency?: "MYR" | "USD" | "SGD" | "EUR" | "GBP" | undefined;
}>;
export declare const buyerSchema: z.ZodObject<{
    name: z.ZodString;
    tin: z.ZodOptional<z.ZodString>;
    countryCode: z.ZodDefault<z.ZodString>;
    isIndividual: z.ZodDefault<z.ZodBoolean>;
    address: z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postcode: z.ZodOptional<z.ZodString>;
        country: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        country: string;
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postcode?: string | undefined;
    }, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postcode?: string | undefined;
        country?: string | undefined;
    }>>;
    contact: z.ZodOptional<z.ZodObject<{
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email?: string | undefined;
        phone?: string | undefined;
    }, {
        email?: string | undefined;
        phone?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    countryCode: string;
    isIndividual: boolean;
    tin?: string | undefined;
    address?: {
        country: string;
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postcode?: string | undefined;
    } | undefined;
    contact?: {
        email?: string | undefined;
        phone?: string | undefined;
    } | undefined;
}, {
    name: string;
    tin?: string | undefined;
    countryCode?: string | undefined;
    isIndividual?: boolean | undefined;
    address?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postcode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    contact?: {
        email?: string | undefined;
        phone?: string | undefined;
    } | undefined;
}>;
export declare const invoiceLineSchema: z.ZodEffects<z.ZodObject<{
    lineNumber: z.ZodNumber;
    itemDescription: z.ZodString;
    itemSku: z.ZodOptional<z.ZodString>;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    discountAmount: z.ZodDefault<z.ZodNumber>;
    sstRate: z.ZodDefault<z.ZodEffects<z.ZodNumber, number, number>>;
    taxExemptionCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    lineNumber: number;
    itemDescription: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    sstRate: number;
    itemSku?: string | undefined;
    taxExemptionCode?: string | undefined;
}, {
    lineNumber: number;
    itemDescription: string;
    quantity: number;
    unitPrice: number;
    itemSku?: string | undefined;
    discountAmount?: number | undefined;
    sstRate?: number | undefined;
    taxExemptionCode?: string | undefined;
}>, {
    lineNumber: number;
    itemDescription: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    sstRate: number;
    itemSku?: string | undefined;
    taxExemptionCode?: string | undefined;
}, {
    lineNumber: number;
    itemDescription: string;
    quantity: number;
    unitPrice: number;
    itemSku?: string | undefined;
    discountAmount?: number | undefined;
    sstRate?: number | undefined;
    taxExemptionCode?: string | undefined;
}>;
export declare const invoiceSchema: z.ZodEffects<z.ZodObject<{
    invoiceNumber: z.ZodString;
    eInvoiceType: z.ZodDefault<z.ZodEnum<["01", "02", "03", "04"]>>;
    issueDate: z.ZodString;
    dueDate: z.ZodOptional<z.ZodString>;
    currency: z.ZodDefault<z.ZodEnum<["MYR", "USD", "SGD", "EUR", "GBP"]>>;
    exchangeRate: z.ZodDefault<z.ZodNumber>;
    isConsolidated: z.ZodDefault<z.ZodBoolean>;
    consolidationPeriod: z.ZodOptional<z.ZodString>;
    referenceInvoiceId: z.ZodOptional<z.ZodString>;
    lineItems: z.ZodArray<z.ZodEffects<z.ZodObject<{
        lineNumber: z.ZodNumber;
        itemDescription: z.ZodString;
        itemSku: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        discountAmount: z.ZodDefault<z.ZodNumber>;
        sstRate: z.ZodDefault<z.ZodEffects<z.ZodNumber, number, number>>;
        taxExemptionCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lineNumber: number;
        itemDescription: string;
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        sstRate: number;
        itemSku?: string | undefined;
        taxExemptionCode?: string | undefined;
    }, {
        lineNumber: number;
        itemDescription: string;
        quantity: number;
        unitPrice: number;
        itemSku?: string | undefined;
        discountAmount?: number | undefined;
        sstRate?: number | undefined;
        taxExemptionCode?: string | undefined;
    }>, {
        lineNumber: number;
        itemDescription: string;
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        sstRate: number;
        itemSku?: string | undefined;
        taxExemptionCode?: string | undefined;
    }, {
        lineNumber: number;
        itemDescription: string;
        quantity: number;
        unitPrice: number;
        itemSku?: string | undefined;
        discountAmount?: number | undefined;
        sstRate?: number | undefined;
        taxExemptionCode?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    currency: "MYR" | "USD" | "SGD" | "EUR" | "GBP";
    invoiceNumber: string;
    eInvoiceType: "02" | "01" | "03" | "04";
    issueDate: string;
    exchangeRate: number;
    isConsolidated: boolean;
    lineItems: {
        lineNumber: number;
        itemDescription: string;
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        sstRate: number;
        itemSku?: string | undefined;
        taxExemptionCode?: string | undefined;
    }[];
    dueDate?: string | undefined;
    consolidationPeriod?: string | undefined;
    referenceInvoiceId?: string | undefined;
}, {
    invoiceNumber: string;
    issueDate: string;
    lineItems: {
        lineNumber: number;
        itemDescription: string;
        quantity: number;
        unitPrice: number;
        itemSku?: string | undefined;
        discountAmount?: number | undefined;
        sstRate?: number | undefined;
        taxExemptionCode?: string | undefined;
    }[];
    currency?: "MYR" | "USD" | "SGD" | "EUR" | "GBP" | undefined;
    eInvoiceType?: "02" | "01" | "03" | "04" | undefined;
    dueDate?: string | undefined;
    exchangeRate?: number | undefined;
    isConsolidated?: boolean | undefined;
    consolidationPeriod?: string | undefined;
    referenceInvoiceId?: string | undefined;
}>, {
    currency: "MYR" | "USD" | "SGD" | "EUR" | "GBP";
    invoiceNumber: string;
    eInvoiceType: "02" | "01" | "03" | "04";
    issueDate: string;
    exchangeRate: number;
    isConsolidated: boolean;
    lineItems: {
        lineNumber: number;
        itemDescription: string;
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        sstRate: number;
        itemSku?: string | undefined;
        taxExemptionCode?: string | undefined;
    }[];
    dueDate?: string | undefined;
    consolidationPeriod?: string | undefined;
    referenceInvoiceId?: string | undefined;
}, {
    invoiceNumber: string;
    issueDate: string;
    lineItems: {
        lineNumber: number;
        itemDescription: string;
        quantity: number;
        unitPrice: number;
        itemSku?: string | undefined;
        discountAmount?: number | undefined;
        sstRate?: number | undefined;
        taxExemptionCode?: string | undefined;
    }[];
    currency?: "MYR" | "USD" | "SGD" | "EUR" | "GBP" | undefined;
    eInvoiceType?: "02" | "01" | "03" | "04" | undefined;
    dueDate?: string | undefined;
    exchangeRate?: number | undefined;
    isConsolidated?: boolean | undefined;
    consolidationPeriod?: string | undefined;
    referenceInvoiceId?: string | undefined;
}>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type BuyerInput = z.infer<typeof buyerSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
//# sourceMappingURL=types.d.ts.map