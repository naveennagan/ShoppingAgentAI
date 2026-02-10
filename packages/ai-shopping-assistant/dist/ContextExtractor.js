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
exports.ContextExtractor = void 0;
const cheerio = __importStar(require("cheerio"));
class ContextExtractor {
    static extractFromDOM() {
        if (typeof globalThis.window === 'undefined') {
            return { type: 'general', elements: {}, capabilities: [] };
        }
        const context = {
            type: 'general',
            elements: {},
            capabilities: []
        };
        // Detect e-commerce
        const hasProducts = document.querySelectorAll('[data-product-id], .product, [itemtype*="Product"]').length > 0;
        const hasCart = document.querySelectorAll('[data-cart], .cart, #cart').length > 0;
        if (hasProducts || hasCart) {
            context.type = 'ecommerce';
            context.elements.products = this.extractProducts();
            context.capabilities.push('product_search', 'add_to_cart', 'checkout');
        }
        // Detect forms
        const forms = document.querySelectorAll('form');
        if (forms.length > 0) {
            context.elements.forms = this.extractForms(forms);
            context.capabilities.push('form_fill', 'form_submit');
        }
        // Extract navigation
        const navLinks = document.querySelectorAll('nav a, header a, [role="navigation"] a');
        context.elements.navigation = Array.from(navLinks).map(a => ({
            text: a.textContent?.trim(),
            href: a.href
        }));
        context.capabilities.push('navigation');
        return context;
    }
    static extractProducts() {
        const products = [];
        // Try multiple selectors
        const productElements = document.querySelectorAll('[data-product-id], .product, [itemtype*="Product"], [data-testid*="product"]');
        productElements.forEach(el => {
            const product = {};
            // Extract ID
            product.id = el.getAttribute('data-product-id') ||
                el.getAttribute('data-id') ||
                el.id;
            // Extract name
            const nameEl = el.querySelector('[itemprop="name"], .product-name, h2, h3');
            product.name = nameEl?.textContent?.trim();
            // Extract price
            const priceEl = el.querySelector('[itemprop="price"], .price, [data-price]');
            const priceText = priceEl?.textContent?.trim() || priceEl?.getAttribute('content');
            product.price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;
            // Extract image
            const imgEl = el.querySelector('img');
            product.image = imgEl?.src;
            if (product.id || product.name) {
                products.push(product);
            }
        });
        return products;
    }
    static extractForms(forms) {
        return Array.from(forms).map(form => {
            const fields = [];
            form.querySelectorAll('input, textarea, select').forEach(field => {
                const input = field;
                fields.push({
                    name: input.name || input.id,
                    type: input.type,
                    label: this.getFieldLabel(input),
                    required: input.required
                });
            });
            return {
                id: form.id,
                action: form.action,
                fields
            };
        });
    }
    static getFieldLabel(input) {
        const id = input.id;
        if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label)
                return label.textContent?.trim() || null;
        }
        const parentLabel = input.closest('label');
        return parentLabel?.textContent?.trim() || null;
    }
    static extractFromHTML(html) {
        const $ = cheerio.load(html);
        const context = {
            type: 'general',
            elements: {},
            capabilities: []
        };
        // Detect products
        const products = [];
        $('[data-product-id], .product, [itemtype*="Product"]').each((_, el) => {
            const $el = $(el);
            products.push({
                id: $el.attr('data-product-id') || $el.attr('id'),
                name: $el.find('[itemprop="name"], .product-name, h2, h3').first().text().trim(),
                price: parseFloat($el.find('[itemprop="price"], .price').first().text().replace(/[^0-9.]/g, ''))
            });
        });
        if (products.length > 0) {
            context.type = 'ecommerce';
            context.elements.products = products;
            context.capabilities.push('product_search', 'add_to_cart');
        }
        return context;
    }
}
exports.ContextExtractor = ContextExtractor;
