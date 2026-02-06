export interface WebsiteContext {
    type: 'ecommerce' | 'content' | 'form' | 'general';
    elements: {
        products?: any[];
        forms?: any[];
        navigation?: Array<{
            text: string;
            href: string;
        }>;
        content?: any[];
    };
    capabilities: string[];
}
export declare class ContextExtractor {
    static extractFromDOM(): WebsiteContext;
    private static extractProducts;
    private static extractForms;
    private static getFieldLabel;
    static extractFromHTML(html: string): WebsiteContext;
}
