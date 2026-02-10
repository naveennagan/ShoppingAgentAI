import { z } from 'zod';
export declare class SchemaGenerator {
    static inferSchema(data: any): z.ZodSchema;
    static generateSchemaDescription(data: any, name?: string): string;
    private static describeType;
    static analyzeWithAI(data: any, apiKey: string, modelName?: string): Promise<{
        schema: string;
        actions: string[];
        capabilities: string[];
    }>;
    static createDynamicPrompt(context: Record<string, any>): string;
}
