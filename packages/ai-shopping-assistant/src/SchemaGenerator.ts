import { z } from 'zod';
import { DEFAULT_MODEL } from './config';
import { SCHEMA_ANALYSIS_PROMPT } from './prompts';

export class SchemaGenerator {
  static inferSchema(data: any): z.ZodSchema {
    if (Array.isArray(data)) {
      if (data.length === 0) return z.array(z.any());
      return z.array(this.inferSchema(data[0]));
    }

    if (data === null) return z.null();
    if (typeof data === 'string') return z.string();
    if (typeof data === 'number') return z.number();
    if (typeof data === 'boolean') return z.boolean();

    if (typeof data === 'object') {
      const shape: Record<string, z.ZodSchema> = {};
      for (const [key, value] of Object.entries(data)) {
        shape[key] = this.inferSchema(value);
      }
      return z.object(shape).partial();
    }

    return z.any();
  }

  static generateSchemaDescription(data: any, name: string = 'data'): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return `${name}: empty array`;
      const sample = data[0];
      return `${name}: array of ${this.describeType(sample)}\nSample: ${JSON.stringify(sample)}`;
    }

    if (typeof data === 'object' && data !== null) {
      const fields = Object.entries(data).map(([key, value]) => {
        return `  - ${key}: ${this.describeType(value)}`;
      }).join('\n');
      return `${name}: object with fields:\n${fields}`;
    }

    return `${name}: ${this.describeType(data)}`;
  }

  private static describeType(value: any): string {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    if (typeof value === 'object') return 'object';
    return typeof value;
  }

  static async analyzeWithAI(data: any, apiKey: string, modelName?: string): Promise<{
    schema: string;
    actions: string[];
    capabilities: string[];
  }> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: modelName || DEFAULT_MODEL,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(SCHEMA_ANALYSIS_PROMPT(data));
    return JSON.parse(result.response.text());
  }

  static createDynamicPrompt(context: Record<string, any>): string {
    const schemas = Object.entries(context).map(([key, value]) => {
      return this.generateSchemaDescription(value, key);
    }).join('\n\n');

    return `
You have access to the following data:

${schemas}

Analyze user requests and determine appropriate actions based on this data structure.
Output JSON with: { "action": "string", "payload": any, "message": "string" }
`;
  }
}
