# Shopping Agent AI

A full-stack e-commerce application with AI-powered shopping assistant.

## Architecture

### Frontend (Next.js)
- **Location**: Root directory
- **Port**: 3000
- **Tech**: Next.js 16, React 19, TypeScript

### Backend (Spring Boot)
- **Location**: `shopping-agent-backend/`
- **Port**: 8080
- **Tech**: Spring Boot 3.2, Java 17, Gemini AI

## Prerequisites

- **Node.js** 18+ and npm
- **Java** 17+
- **Maven** 3.6+
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Setup Instructions

### 1. Backend Setup

```bash
cd shopping-agent-backend/src/main/resources
cp application.properties.example application.properties
# Edit application.properties and add your API key

cd ../../..
mvn clean install
mvn spring-boot:run
```

Backend runs on http://localhost:8080

**To stop:** Press `Ctrl+C` twice or use `kill -9 $(lsof -ti:8080)`

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8080
EOF

# Run development server
npm run dev
```

Frontend runs on http://localhost:3000

**To stop:** Press `Ctrl+C`

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/{id}` - Get product by ID

### Cart (Session-based)
- `GET /api/cart/{sessionId}` - Get cart
- `POST /api/cart/{sessionId}/add?productId=X&quantity=1` - Add to cart
- `DELETE /api/cart/{sessionId}/remove/{productId}` - Remove from cart
- `DELETE /api/cart/{sessionId}/clear` - Clear cart
- `PUT /api/cart/{sessionId}/update?productId=X&quantity=2` - Update quantity

### Chat
- `POST /api/chat` - AI chat endpoint

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

- 🛍️ Product browsing and search
- 🤖 AI-powered shopping assistant (Gemini)
- 🛒 Shopping cart management (backend storage)
- 💬 Persistent chat history (backend storage)
- 💳 Checkout with AI autofill
- 📦 Order tracking
- 🎨 Responsive UI design
- 📊 API call logging

## Data Storage

### Backend (In-Memory)
- **Products**: 24 products stored in `ProductService`
- **Cart**: Session-based cart in `ConcurrentHashMap`
- **Chat History**: Session-based messages in `ConcurrentHashMap`

⚠️ **Note**: All data is in-memory and will be lost on server restart. No database configured.

### Frontend
- **Session ID**: Generated and stored in browser localStorage
- **UI State**: React Context for real-time updates

## Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
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

## Project Structure

```
ShoppingAgentAI/
├── src/                          # Next.js frontend
│   ├── app/                      # Pages and routes
│   │   ├── cart/                 # Cart page
│   │   ├── checkout/             # Checkout page
│   │   ├── products/             # Product pages
│   │   └── tracking/             # Order tracking
│   ├── components/
│   │   ├── AiChatWidget.tsx      # Chat widget (uses backend)
│   │   ├── Navbar.tsx
│   │   └── ProductCard.tsx
│   ├── context/
│   │   └── CartContext.tsx       # Cart state (uses backend API)
│   └── lib/
│       ├── api-client.ts         # Backend API client
│       └── products.ts           # TypeScript interfaces
│
├── shopping-agent-backend/       # Spring Boot backend
│   ├── src/main/java/com/shoppingagent/
│   │   ├── controller/
│   │   │   ├── ChatController.java           # AI chat
│   │   │   ├── ProductController.java        # Products
│   │   │   ├── CartController.java           # Cart management
│   │   │   └── ChatHistoryController.java    # Chat history
│   │   ├── service/
│   │   │   ├── GeminiService.java            # Gemini AI
│   │   │   ├── ProductService.java           # 24 products
│   │   │   ├── CartService.java              # Cart logic
│   │   │   └── ChatHistoryService.java       # Chat storage
│   │   ├── model/
│   │   │   ├── Product.java
│   │   │   ├── Cart.java
│   │   │   ├── ChatHistory.java
│   │   │   ├── ChatRequest.java
│   │   │   └── ChatResponse.java
│   │   └── ShoppingAgentApplication.java
│   ├── src/main/resources/
│   │   ├── application.properties        # Config (gitignored)
│   │   └── application.properties.example
│   └── pom.xml
│
├── .env.local                    # Frontend env (gitignored)
├── .gitignore                    # Ignores: .env*, application.properties, packages/
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

**Network/Proxy issues:**
Backend handles SSL bypass for Gemini API calls.

**API Key leaked:**
1. Get new key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Never commit `application.properties` or `.env.local`
3. Use environment variables: `export GEMINI_API_KEY=your_key`

**Cart/Chat not persisting:**
Data is in-memory only. Restart backend = data lost. Add database for persistence.

## License

MIT
