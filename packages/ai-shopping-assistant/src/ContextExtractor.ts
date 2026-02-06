import * as cheerio from 'cheerio';

export interface WebsiteContext {
  type: 'ecommerce' | 'content' | 'form' | 'general';
  elements: {
    products?: any[];
    forms?: any[];
    navigation?: Array<{text: string; href: string}>;
    content?: any[];
  };
  capabilities: string[];
}

export class ContextExtractor {
  static extractFromDOM(): WebsiteContext {
    if (typeof (globalThis as any).window === 'undefined') {
      return { type: 'general', elements: {}, capabilities: [] };
    }

    const context: WebsiteContext = {
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
      href: (a as HTMLAnchorElement).href
    }));
    context.capabilities.push('navigation');

    return context;
  }

  private static extractProducts(): any[] {
    const products: any[] = [];
    
    // Try multiple selectors
    const productElements = document.querySelectorAll(
      '[data-product-id], .product, [itemtype*="Product"], [data-testid*="product"]'
    );

    productElements.forEach(el => {
      const product: any = {};
      
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

  private static extractForms(forms: NodeListOf<Element>): any[] {
    return Array.from(forms).map(form => {
      const fields: any[] = [];
      
      form.querySelectorAll('input, textarea, select').forEach(field => {
        const input = field as HTMLInputElement;
        fields.push({
          name: input.name || input.id,
          type: input.type,
          label: this.getFieldLabel(input),
          required: input.required
        });
      });

      return {
        id: form.id,
        action: (form as HTMLFormElement).action,
        fields
      };
    });
  }

  private static getFieldLabel(input: HTMLElement): string | null {
    const id = input.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent?.trim() || null;
    }
    
    const parentLabel = input.closest('label');
    return parentLabel?.textContent?.trim() || null;
  }

  static extractFromHTML(html: string): WebsiteContext {
    const $ = cheerio.load(html);
    
    const context: WebsiteContext = {
      type: 'general',
      elements: {},
      capabilities: []
    };

    // Detect products
    const products: any[] = [];
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
