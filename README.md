# Shopping Agent AI

A full-stack e-commerce application with AI-powered shopping assistant, featuring Supabase database integration, promotional bundles, and advanced cart management.

## Architecture

### Frontend (Next.js)
- **Location**: Root directory
- **Port**: 3000
- **Tech**: Next.js 16, React 19, TypeScript, SCSS

### Backend (Spring Boot)
- **Location**: `shopping-agent-backend/`
- **Port**: 8080
- **Tech**: Spring Boot 3.2, Java 17, Gemini AI, Supabase

### Database (Supabase)
- **PostgreSQL** with REST API
- **Real-time** data synchronization
- **Authentication** ready

## Prerequisites

- **Node.js** 18+ and npm
- **Java** 17+
- **Maven** 3.6+
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Supabase Project** with database setup

## Setup Instructions

### 1. Database Setup (Supabase)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the database schema from `scripts/schema.sql`
3. Seed products using `scripts/seed-products.mjs`
4. Get your project URL and API keys from Settings > API

### 2. Backend Setup

```bash
cd shopping-agent-backend/src/main/resources
cp application.properties.example application.properties
# Edit application.properties and add your API keys:
# - gemini.api.key=your_gemini_key
# - supabase.url=your_supabase_url
# - supabase.key=your_supabase_anon_key

cd ../../..
mvn clean install
mvn spring-boot:run
```

Backend runs on http://localhost:8080

**To stop:** Press `Ctrl+C` twice or use `kill -9 $(lsof -ti:8080)`

### 3. Frontend Setup

```bash
# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8080
GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
EOF

# Run development server
npm run dev
```

Frontend runs on http://localhost:3000

**To stop:** Press `Ctrl+C`

## API Endpoints

### Products (Supabase-backed)
- `GET /api/products` - Get all products from database
- `GET /api/products/{id}` - Get product by ID from database

### Cart (Session-based)
- `GET /api/cart/{sessionId}` - Get cart
- `POST /api/cart/{sessionId}/add?productId=X&quantity=1` - Add to cart
- `DELETE /api/cart/{sessionId}/remove/{productId}` - Remove from cart
- `DELETE /api/cart/{sessionId}/clear` - Clear cart
- `PUT /api/cart/{sessionId}/update?productId=X&quantity=2` - Update quantity

### Orders (Database-backed)
- `POST /api/orders` - Create new order
- `GET /api/orders/{sessionId}` - Get orders for session
- `GET /api/orders/track/{orderId}` - Track order status

### Bundles & Promotions
- `GET /api/bundles` - Get available product bundles
- `GET /api/promotions/validate-coupon` - Validate coupon codes

### Chat (AI-powered)
- `POST /api/chat` - AI chat endpoint with Gemini

### Chat History (Session-based)
- `GET /api/chat-history/{sessionId}` - Get chat history
- `POST /api/chat-history/{sessionId}/add?role=user&text=hello` - Add message
- `DELETE /api/chat-history/{sessionId}/clear` - Clear history

**Example:**
```bash
curl http://localhost:8080/api/products
curl -X POST "http://localhost:8080/api/cart/session_123/add?productId=ph-1&quantity=1"
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Show me phones","history":[]}'
```

## Features

- 🛍️ **Product Management**: Database-backed product catalog with Supabase
- 🤖 **AI Shopping Assistant**: Gemini-powered conversational shopping help
- 🛒 **Smart Cart**: Session-based cart with real-time updates
- 💬 **Persistent Chat**: Backend-stored conversation history
- 🎁 **Product Bundles**: Curated product combinations with discounts
- 🎫 **Coupon System**: Promotional codes with validation
- 💳 **Checkout Flow**: AI-assisted form filling and order processing
- 📦 **Order Tracking**: Real-time order status updates
- 🎨 **Responsive Design**: Mobile-first UI with SCSS styling
- 📊 **Comprehensive Logging**: Detailed API call monitoring
- 🔒 **Error Handling**: Graceful fallbacks and exception management

## Data Storage

### Database (Supabase PostgreSQL)
- **Products**: Stored in `products` table with full product information
- **Orders**: Persistent order history in `orders` table
- **Bundles**: Product bundle configurations in `bundles` and `bundle_items` tables
- **Promotions**: Coupon codes and discount rules in `promotions` table

### Backend (In-Memory)
- **Cart**: Session-based cart in `ConcurrentHashMap` (temporary storage)
- **Chat History**: Session-based messages in `ConcurrentHashMap` (temporary storage)

### Frontend
- **Session ID**: Generated and stored in browser localStorage
- **UI State**: React Context for real-time updates

⚠️ **Note**: Cart and chat data are in-memory and will be lost on server restart. Products and orders persist in Supabase database.

## Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- SCSS/CSS Modules
- Lucide Icons
- Context API for state

**Backend:**
- Spring Boot 3.2
- Java 17
- Google Gemini AI API
- Maven
- Lombok
- Gson
- SLF4J Logging

**Database:**
- Supabase (PostgreSQL)
- PostgREST API
- Real-time subscriptions

**Testing:**
- Vitest (Frontend)
- JUnit 5 (Backend)
- jqwik (Property-based testing)

## Project Structure

```
ShoppingAgentAI/
├── src/                          # Next.js frontend
│   ├── app/                      # App Router pages
│   │   ├── api/chat/             # Frontend API routes
│   │   ├── cart/                 # Cart page
│   │   ├── checkout/             # Checkout page
│   │   ├── orders/               # Order history
│   │   ├── products/             # Product pages
│   │   └── tracking/             # Order tracking
│   ├── components/
│   │   ├── AiChatWidget.tsx      # Chat widget (uses backend)
│   │   ├── AiChatPanel.tsx       # Full chat interface
│   │   ├── ProductCard.tsx       # Product display
│   │   ├── ProductGrid.tsx       # Product listing
│   │   └── Navbar.tsx            # Navigation
│   ├── context/
│   │   └── CartContext.tsx       # Cart state (uses backend API)
│   ├── lib/
│   │   ├── api-client.ts         # Backend API client
│   │   ├── products.ts           # TypeScript interfaces
│   │   ├── discountCalculator.ts # Promotion logic
│   │   └── __tests__/            # Frontend tests
│   └── styles/
│       ├── components/           # Component styles
│       ├── pages/                # Page styles
│       └── main.css              # Global styles
│
├── shopping-agent-backend/       # Spring Boot backend
│   ├── src/main/java/com/shoppingagent/
│   │   ├── controller/
│   │   │   ├── ProductController.java        # Products API
│   │   │   ├── CartController.java           # Cart management
│   │   │   ├── OrderController.java          # Order processing
│   │   │   ├── BundleController.java         # Product bundles
│   │   │   ├── PromotionController.java      # Coupon validation
│   │   │   ├── ChatController.java           # AI chat
│   │   │   └── ChatHistoryController.java    # Chat history
│   │   ├── service/
│   │   │   ├── ProductService.java           # Product logic
│   │   │   ├── CartService.java              # Cart logic
│   │   │   ├── OrderService.java             # Order logic
│   │   │   ├── PromotionService.java         # Promotion logic
│   │   │   ├── GeminiService.java            # Gemini AI
│   │   │   ├── SupabaseClient.java           # Database client
│   │   │   └── ChatHistoryService.java       # Chat storage
│   │   ├── model/
│   │   │   ├── Product.java
│   │   │   ├── Cart.java
│   │   │   ├── Order.java
│   │   │   ├── Bundle.java
│   │   │   ├── Promotion.java
│   │   │   └── ChatHistory.java
│   │   ├── util/
│   │   │   └── DiscountCalculator.java       # Discount logic
│   │   ├── exception/
│   │   │   ├── SupabaseConnectionException.java
│   │   │   └── InvalidCouponException.java
│   │   └── ShoppingAgentApplication.java
│   ├── src/main/resources/
│   │   ├── application.properties        # Config (gitignored)
│   │   └── application.properties.example
│   └── pom.xml
│
├── scripts/
│   ├── schema.sql                # Database schema
│   └── seed-products.mjs         # Product seeding script
│
├── .env.local                    # Frontend env (gitignored)
├── .gitignore                    # Ignores: .env*, application.properties
├── package.json
└── README.md
```

## Development

Run both servers simultaneously:

**Terminal 1 (Backend):**
```bash
cd shopping-agent-backend
mvn spring-boot:run
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

**Watch logs:** Backend terminal shows all API calls with details.

## Logging

Backend logs all API calls:
```
INFO  ProductController - GET /api/products - Fetching all products
INFO  ProductController - Returning 24 products
INFO  CartController - POST /api/cart/session_123/add - Adding product: ph-1 (qty: 1)
INFO  CartController - Cart now has 1 items
INFO  ChatController - POST /api/chat - Message: Show me phones
INFO  ChatController - AI Response - Action: NONE, Message: We have several...
```

## Troubleshooting

**Port already in use:**
```bash
kill -9 $(lsof -ti:8080)  # Backend
kill -9 $(lsof -ti:3000)  # Frontend
```

**Maven plugin error:**
Ensure `pom.xml` has Spring Boot plugin version specified.

**Supabase connection issues:**
1. Verify your Supabase URL and API key in `application.properties`
2. Check if your Supabase project is active
3. Ensure database tables exist (run `scripts/schema.sql`)

**Network/Proxy issues:**
Backend handles SSL bypass for Gemini API calls.

**API Key leaked:**
1. Get new key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Never commit `application.properties` or `.env.local`
3. Use environment variables: `export GEMINI_API_KEY=your_key`

**Cart/Chat not persisting:**
Cart and chat data are in-memory only. Restart backend = data lost. Products and orders persist in Supabase.

**Frontend build issues:**
```bash
rm -rf .next node_modules
npm install
npm run dev
```

## License

MIT
