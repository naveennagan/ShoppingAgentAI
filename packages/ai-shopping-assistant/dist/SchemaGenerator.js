"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaGenerator = void 0;
const zod_1 = require("zod");
const config_1 = require("./config");
const prompts_1 = require("./prompts");
class SchemaGenerator {
    static inferSchema(data) {
        if (Array.isArray(data)) {
            if (data.length === 0)
                return zod_1.z.array(zod_1.z.any());
            return zod_1.z.array(this.inferSchema(data[0]));
        }
        if (data === null)
            return zod_1.z.null();
        if (typeof data === 'string')
            return zod_1.z.string();
        if (typeof data === 'number')
            return zod_1.z.number();
        if (typeof data === 'boolean')
            return zod_1.z.boolean();
        if (typeof data === 'object') {
            const shape = {};
            for (const [key, value] of Object.entries(data)) {
                shape[key] = this.inferSchema(value);
            }
            return zod_1.z.object(shape).partial();
        }
        return zod_1.z.any();
    }
    static generateSchemaDescription(data, name = 'data') {
        if (Array.isArray(data)) {
            if (data.length === 0)
                return `${name}: empty array`;
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
    static describeType(value) {
        if (Array.isArray(value))
            return 'array';
        if (value === null)
            return 'null';
        if (typeof value === 'object')
            return 'object';
        return typeof value;
    }
    static async analyzeWithAI(data, apiKey, modelName) {
        const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require('@google/generative-ai')));
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: modelName || config_1.DEFAULT_MODEL,
            generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent((0, prompts_1.SCHEMA_ANALYSIS_PROMPT)(data));
        return JSON.parse(result.response.text());
    }
    static createDynamicPrompt(context) {
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
exports.SchemaGenerator = SchemaGenerator;
