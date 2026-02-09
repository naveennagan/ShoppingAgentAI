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

### Backend (Spring Boot)
- `GET /api/products` - Get all products
- `GET /api/products/{id}` - Get product by ID
- `POST /api/chat` - AI chat endpoint

**Example:**
```bash
curl http://localhost:8080/api/products
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Show me phones","history":[]}'
```

## Features

- 🛍️ Product browsing and search
- 🤖 AI-powered shopping assistant (Gemini)
- 🛒 Shopping cart management
- 💳 Checkout with AI autofill
- 📦 Order tracking
- 🎨 Responsive UI design

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

## Project Structure

```
ShoppingAgentAI/
├── src/                          # Next.js frontend
│   ├── app/                      # Pages and routes
│   │   ├── api/chat/             # (Deprecated - now uses backend)
│   │   ├── cart/                 # Cart page
│   │   ├── checkout/             # Checkout page
│   │   ├── products/             # Product pages
│   │   └── tracking/             # Order tracking
│   ├── components/               # React components
│   │   ├── AiChatWidget.tsx      # Floating chat widget
│   │   ├── Navbar.tsx            # Navigation bar
│   │   ├── ProductCard.tsx       # Product display card
│   │   └── Providers.tsx         # Context providers
│   ├── context/
│   │   └── CartContext.tsx       # Cart state management
│   └── lib/
│       ├── api-client.ts         # Backend API client
│       ├── products.ts           # Product data (frontend)
│       └── agent/intents.ts      # AI intent detection
│
├── shopping-agent-backend/       # Spring Boot backend
│   ├── src/main/java/com/shoppingagent/
│   │   ├── controller/
│   │   │   ├── ChatController.java       # /api/chat endpoint
│   │   │   └── ProductController.java    # /api/products endpoint
│   │   ├── service/
│   │   │   ├── GeminiService.java        # Gemini AI integration
│   │   │   └── ProductService.java       # Product business logic
│   │   ├── model/
│   │   │   ├── Product.java              # Product entity
│   │   │   ├── ChatRequest.java          # Chat request DTO
│   │   │   └── ChatResponse.java         # Chat response DTO
│   │   └── ShoppingAgentApplication.java # Main Spring Boot app
│   ├── src/main/resources/
│   │   ├── application.properties        # Config (gitignored)
│   │   └── application.properties.example # Config template
│   ├── pom.xml                           # Maven dependencies
│   └── README.md                         # Backend docs
│
├── packages/
│   └── ai-shopping-assistant/    # Standalone AI package
│       └── src/
│           ├── AIShoppingAssistant.ts
│           ├── ContextExtractor.ts
│           └── useAIAssistant.ts
│
├── .env.local                    # Frontend env (gitignored)
├── .env.local.example            # Frontend env template
├── package.json                  # Frontend dependencies
└── README.md                     # This file
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

## Troubleshooting

**Port already in use:**
```bash
# Kill process on port 8080
kill -9 $(lsof -ti:8080)

# Kill process on port 3000
kill -9 $(lsof -ti:3000)
```

**Maven plugin error:**
Ensure `pom.xml` has Spring Boot plugin version specified.

**Network/Proxy issues:**
If behind corporate proxy, the backend handles SSL bypass for Gemini API calls.

**API Key leaked:**
1. Get new key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Never commit `application.properties` or `.env.local`
3. Use environment variables: `export GEMINI_API_KEY=your_key`

## License

MIT
