# Universal AI Assistant SDK

AI assistant that works on **any website** - automatically detects context and capabilities.

## Features

✅ **Auto-detect website type** (e-commerce, forms, content, etc.)  
✅ **Extract page context** (products, forms, navigation)  
✅ **Flexible action system** - register any custom action  
✅ **Data providers** - connect any API or database  
✅ **React hook** included  
✅ **TypeScript** with Zod validation  

## Installation

```bash
npm install @ai-shop/assistant @google/generative-ai zod cheerio
```

## Quick Start

### 1. E-commerce Website

```typescript
import { AIShoppingAssistant } from '@ai-shop/assistant';

const assistant = new AIShoppingAssistant({
  apiKey: process.env.GEMINI_API_KEY,
  autoDetectContext: true, // Auto-detects products on page
  
  dataProviders: {
    products: async () => {
      const res = await fetch('/api/products');
      return res.json();
    },
    cart: async () => {
      const res = await fetch('/api/cart');
      return res.json();
    }
  },
  
  actions: {
    add_to_cart: async (productId) => {
      await fetch('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId })
      });
    },
    navigate: (path) => {
      window.location.href = path;
    }
  }
});

await assistant.initialize();
const response = await assistant.chat('Add iPhone to cart');
```

### 2. Form Website

```typescript
const assistant = new AIShoppingAssistant({
  apiKey: process.env.GEMINI_API_KEY,
  
  actions: {
    fill_form: (data) => {
      Object.entries(data).forEach(([name, value]) => {
        const input = document.querySelector(`[name="${name}"]`);
        if (input) input.value = value;
      });
    },
    submit_form: () => {
      document.querySelector('form')?.submit();
    }
  }
});

await assistant.initialize();
await assistant.chat('Fill the form with my details');
```

### 3. Content Website

```typescript
const assistant = new AIShoppingAssistant({
  apiKey: process.env.GEMINI_API_KEY,
  
  dataProviders: {
    articles: async () => {
      const res = await fetch('/api/articles');
      return res.json();
    }
  },
  
  actions: {
    search: async (query) => {
      window.location.href = `/search?q=${query}`;
    },
    bookmark: async (articleId) => {
      await fetch(`/api/bookmarks/${articleId}`, { method: 'POST' });
    }
  }
});
```

### 4. CommerceTools Integration

```typescript
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

const apiRoot = createApiBuilderFromCtpClient(client);

const assistant = new AIShoppingAssistant({
  apiKey: process.env.GEMINI_API_KEY,
  
  dataProviders: {
    products: async () => {
      const { body } = await apiRoot.products().get().execute();
      return body.results.map(p => ({
        id: p.id,
        name: p.masterData.current.name['en'],
        price: p.masterData.current.masterVariant.prices[0].value.centAmount / 100
      }));
    },
    cart: async () => {
      const { body } = await apiRoot.carts().withId({ ID: cartId }).get().execute();
      return body;
    }
  },
  
  actions: {
    add_to_cart: async (productId) => {
      await apiRoot.carts().withId({ ID: cartId }).post({
        body: {
          version: cartVersion,
          actions: [{ action: 'addLineItem', productId }]
        }
      }).execute();
    }
  }
});
```

### 5. React Hook

```typescript
import { useAIAssistant } from '@ai-shop/assistant';

function ChatWidget() {
  const { messages, sendMessage, isLoading } = useAIAssistant({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    autoDetectContext: true,
    
    actions: {
      add_to_cart: async (productId) => {
        // Your logic
      }
    }
  });

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.text}</div>
      ))}
      <input onSubmit={(e) => sendMessage(e.target.value)} />
    </div>
  );
}
```

## API

### AIShoppingAssistant

```typescript
constructor(config: {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  autoDetectContext?: boolean;
  actions?: Record<string, (payload: any) => Promise<void>>;
  dataProviders?: Record<string, () => Promise<any>>;
})
```

**Methods:**
- `initialize()` - Auto-detect context and fetch data
- `chat(message, history?)` - Send message and get response
- `registerAction(name, handler)` - Add custom action
- `registerDataProvider(name, provider)` - Add data source
- `updateContext(context)` - Update context manually
- `getContext()` - Get current context

### Auto-Detection

The assistant automatically detects:
- Products (via `[data-product-id]`, `.product`, etc.)
- Forms (all `<form>` elements)
- Navigation links
- Website type (e-commerce, content, form, general)

### Custom Actions

Register any action:

```typescript
assistant.registerAction('custom_action', async (payload) => {
  // Your logic
});
```

Then AI can use it:
```
User: "Do custom action with data X"
AI: { action: "custom_action", payload: "X", message: "Done!" }
```

## Dependencies

- `@google/generative-ai` - Gemini AI
- `zod` - Response validation
- `cheerio` - HTML parsing (server-side)

## License

MIT
