import { EmailTemplate, Language } from './types';
export declare const EMAIL_TEMPLATES: Record<string, Record<Language, EmailTemplate>>;
export declare const getEmailTemplate: (templateId: string, language?: Language) => EmailTemplate | null;
export declare const getAllTemplateIds: () => string[];
export declare const getTemplateSupportedLanguages: (templateId: string) => Language[];
