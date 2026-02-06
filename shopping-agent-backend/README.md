# Shopping Agent Backend (Spring Boot)

## Prerequisites
- Java 17 or higher
- Maven 3.6+

## Setup

1. Set environment variable:
```bash
export GEMINI_API_KEY=your_api_key_here
```

2. Build and run:
```bash
cd shopping-agent-backend
mvn clean install
mvn spring-boot:run
```

Backend will run on http://localhost:8080

## API Endpoints

- `GET /api/products` - Get all products
- `GET /api/products/{id}` - Get product by ID
- `POST /api/chat` - AI chat endpoint

## Request Example

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me phones", "history": []}'
```
