export declare const SYSTEM_PROMPT_TEMPLATE: (context: {
    websiteType?: string;
    capabilities?: string;
    schemaInfo: string;
    availableActions: string;
}) => string;
export declare const SCHEMA_ANALYSIS_PROMPT: (data: any) => string;
