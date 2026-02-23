# Shopping Agent Backend (Spring Boot)

## Prerequisites
- Java 17 or higher
- Maven 3.6+
- Supabase account and project

## Setup

1. Configure `src/main/resources/application.properties`:
```properties
# Gemini API Configuration
gemini.api.key=${GEMINI_API_KEY}
gemini.model=gemini-2.5-flash

# Supabase Configuration
supabase.url=your_supabase_project_url
supabase.key=your_supabase_anon_key
supabase.service.key=your_supabase_service_role_key
```

2. Set environment variable (optional):
```bash
export GEMINI_API_KEY=your_api_key_here
```

3. Build and run:
```bash
cd shopping-agent-backend
mvn clean install
mvn spring-boot:run
```

Backend will run on http://localhost:8080

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/{id}` - Get product by ID

### Chat
- `POST /api/chat` - AI chat endpoint

### Cart
- `GET /api/cart/{sessionId}` - Get cart for session
- `POST /api/cart/{sessionId}/add?productId={id}&quantity={qty}` - Add product to cart
- `POST /api/cart/{sessionId}/add-batch` - Add multiple products to cart
- `PUT /api/cart/{sessionId}/update?productId={id}&quantity={qty}` - Update product quantity
- `DELETE /api/cart/{sessionId}/remove/{productId}` - Remove product from cart
- `DELETE /api/cart/{sessionId}/clear` - Clear cart

### Orders
- `POST /api/orders?sessionId={id}&shippingAddress={address}&paymentMethod={method}` - Create order
- `GET /api/orders?sessionId={id}` - Get orders by session
- `GET /api/orders/{orderId}` - Get order by ID

### Promotions
- `GET /api/promotions` - Get all promotions
- `GET /api/promotions/product/{productId}` - Get promotions for product
- `GET /api/promotions/coupon-product-mappings` - Get coupon-product mappings
- `POST /api/promotions/validate-code` - Validate coupon code

### Bundles
- `GET /api/bundles` - Get all bundles
- `GET /api/bundles/active` - Get active bundles

### Chat History
- `GET /api/chat-history/{sessionId}` - Get chat history
- `POST /api/chat-history/{sessionId}/add?role={role}&text={text}` - Add message to history
- `DELETE /api/chat-history/{sessionId}/clear` - Clear chat history

## Request Examples

```bash
# Chat with AI
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me phones", "history": []}'

# Add product to cart
curl -X POST "http://localhost:8080/api/cart/session123/add?productId=prod1&quantity=2"

# Validate coupon
curl -X POST http://localhost:8080/api/promotions/validate-code \
  -H "Content-Type: application/json" \
  -d '{"code": "SAVE10", "productIds": ["prod1", "prod2"]}'
```
