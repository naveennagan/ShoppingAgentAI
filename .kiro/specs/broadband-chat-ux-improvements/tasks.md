# Implementation Plan: Broadband Chat UX Improvements

## Overview

Incremental implementation across backend hardening (embedding fix + ingestion resilience), backend chat enhancements (ChatRequest model, controller, system prompt), frontend proxy migration (route.ts), and frontend UX improvements (AiChatPanel guided flow). Each task builds on the previous, starting with the backend foundation and ending with full integration.

## Tasks

- [x] 1. Fix embedding model and harden ingestion pipeline
  - [x] 1.1 Fix EmbeddingService model and API version
    - Update `application.properties` to set `gemini.embedding.model=gemini-embedding-001`
    - In `EmbeddingService.java`, change the API URL from `v1beta` to `v1` and use the `gemini-embedding-001` model
    - Verify the URL format is `https://generativelanguage.googleapis.com/v1/models/gemini-embedding-001:embedContent`
    - _Requirements: 7.1_

  - [x] 1.2 Add ingestion rate-limit configuration properties
    - Add `ingestion.item-delay-ms=200`, `ingestion.batch-size=10`, `ingestion.batch-pause-ms=2000`, `ingestion.max-retries=3` to `application.properties`
    - Create or update a config class to bind these properties in `IngestionService.java`
    - _Requirements: 7.2, 7.3_

  - [x] 1.3 Implement batched ingestion with per-item delay
    - Refactor `IngestionService.ingestAll()` to process items in batches of `batch-size`
    - Insert `item-delay-ms` delay between each embedding API call within a batch
    - Insert `batch-pause-ms` pause between batches
    - _Requirements: 7.2, 7.3_

  - [x] 1.4 Implement exponential backoff retry for embedding failures
    - On HTTP 429 or 5xx from the embedding API, retry with exponential backoff (base 1s, max 3 retries)
    - Log each retry attempt with retry number, wait duration, and the triggering error
    - Log the full error response body including status code, error message, and rate-limit headers (e.g., Retry-After)
    - After exhausting retries, log the item identifier and error, then continue to the next item
    - _Requirements: 7.4, 7.5, 7.10, 7.11_

  - [x] 1.5 Add ingestion summary logging and startup auto-ingestion
    - After `ingestAll()` completes, log a summary: total items attempted, successfully ingested, and failed
    - Add an `@EventListener(ApplicationReadyEvent.class)` method that queries `knowledge_documents` count and triggers `ingestAll()` asynchronously if count is 0
    - _Requirements: 7.6, 7.7_

  - [x] 1.6 Add RAG health check endpoint
    - Create `GET /api/rag/health` endpoint in `RagController.java`
    - Return `{ documentCount, status: "healthy"|"empty" }` based on vector store count
    - Include `warning: "RAG pipeline has no data to search against"` when status is "empty"
    - _Requirements: 7.8, 7.9_

  - [x] 1.7 Write property test: ingestion resilience (Property 10)
    - **Property 10: Single failure does not halt pipeline**
    - Generate batches with one failing item, verify N-1 successes and 1 failure
    - **Validates: Requirements 7.4, 7.5**

  - [x] 1.8 Write property test: ingestion result counts (Property 11)
    - **Property 11: Ingestion result counts are consistent**
    - Generate ingestion runs with random success/failure distributions, verify totalIngested + failures == total attempted
    - **Validates: Requirements 7.6**

  - [x] 1.9 Write property test: health check status (Property 12)
    - **Property 12: Health check status reflects document count**
    - Generate random non-negative document counts, verify status is "healthy" when count > 0 and "empty" when count == 0, with warning when empty
    - **Validates: Requirements 7.8, 7.9**

- [x] 2. Checkpoint - Ensure all backend ingestion tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Enhance backend chat endpoint for frontend proxy support
  - [x] 3.1 Extend ChatRequest model with cart context
    - Add `cartItems` (List of CartItem) and `appliedCouponCode` (String) fields to `ChatRequest.java`
    - Create nested `CartItem` class with `productId`, `name`, `price`, `quantity` fields
    - _Requirements: 6.6_

  - [x] 3.2 Update ChatController to pass cart context to GeminiService
    - Forward `cartItems` and `appliedCouponCode` from `ChatRequest` to the system prompt builder
    - Ensure the RAG pipeline retrieves relevant context via similarity search instead of full catalog
    - _Requirements: 6.6, 6.8_

  - [x] 3.3 Update backend system prompt with formatting and query recognition rules
    - Add instructions to `GeminiService.buildRagSystemPrompt` for: bullet-point formatting for all lists of 2+ items, including item count before lists, recognizing plan feature queries, recognizing installation date queries and routing to appointment actions
    - Include cart context in the system prompt when available
    - _Requirements: 1.4, 4.5, 5.6_

  - [x] 3.4 Write property test: RAG retrieval returns subset (Property 9)
    - **Property 9: RAG retrieval returns subset of documents**
    - Generate random queries, verify context size ≤ topK and relevance scores ≥ threshold
    - **Validates: Requirements 6.8**

  - [x] 3.5 Write property test: appointment booking round trip (Property 6)
    - **Property 6: Appointment booking round trip**
    - Generate random valid appointment slots, book and retrieve, verify date/time/status consistency
    - **Validates: Requirements 5.2, 5.3**

- [x] 4. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. Migrate frontend chat route to backend proxy
  - [x] 5.1 Replace route.ts with backend proxy
    - Remove `GoogleGenerativeAI` import, SDK initialization, `fetchBackendData()`, `createShoppingAssistantPrompt` call, `resolveId`/`resolvePayload` logic, and `extractMessage` helper
    - Implement thin proxy: forward `message`, `history`, `cartItems`, `appliedCouponCode` to `POST ${API_URL}/api/chat`
    - Return backend response JSON directly to the caller
    - On backend error or unreachable, return `{ action: 'none', message: 'Chat service is temporarily unavailable. Please try again.' }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_

  - [x] 5.2 Write property test: chat route proxies response unchanged (Property 7)
    - **Property 7: Chat route proxies backend response unchanged**
    - Generate random ChatResponse JSON objects, verify passthrough is identical
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 5.3 Write property test: chat route forwards history and cart (Property 8)
    - **Property 8: Chat route forwards history and cart context**
    - Generate random messages with history and cart items, verify request body contains all fields
    - **Validates: Requirements 6.6**

  - [ ]* 5.4 Write property test: frontend error handling (Property 13)
    - **Property 13: Frontend error handling returns friendly message**
    - Generate random error status codes (400–599), verify response has `action: 'none'` and non-empty message
    - **Validates: Requirements 6.7**

- [x] 6. Checkpoint - Ensure frontend proxy tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement bulleted list formatting and full address display
  - [x] 7.1 Update system prompt for bullet-point formatting
    - In `src/lib/prompts.ts`, add instructions to format any list of 2+ items using bullet points and include item count before lists
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 7.2 Display all addresses with chips in AiChatPanel
    - In `AiChatPanel.tsx`, remove `addresses.slice(0, 4)` and render chips for ALL addresses
    - Format address list as bulleted items (`• Address line`) instead of numbered text
    - Ensure chip container uses `flexWrap: 'wrap'` and scrollable overflow for large lists
    - Accept numeric selection from 1 to N (total addresses)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 7.3 Write property test: list formatting (Property 1)
    - **Property 1: List formatting produces bulleted output with count**
    - Generate random item lists (2–50 items), verify bulleted format and count in message
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 7.4 Write property test: all addresses displayed (Property 2)
    - **Property 2: All addresses displayed and selectable**
    - Generate random address lists (1–30), verify all addresses appear and all chips rendered
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 7.5 Write property test: numeric address selection (Property 3)
    - **Property 3: Numeric address selection resolves correctly**
    - Generate random list sizes and valid indices, verify correct address resolution
    - **Validates: Requirements 2.4**

- [x] 8. Implement preference-based plan filtering
  - [x] 8.1 Add preferences step to guided flow
    - Add `'preferences'` step to `STEP_ORDER` between `'address'` and `'plan'` in `AiChatPanel.tsx`
    - After address selection, prompt user with preference question and suggested action chips: `['Fast speeds', 'Budget-friendly', 'Short contract', 'Show all plans']`
    - Define `PreferenceFilter` type with `speedTier`, `maxBudget`, `maxContractMonths`, `usageType`, `showAll` fields
    - _Requirements: 3.1, 3.2_

  - [x] 8.2 Implement plan filtering logic based on preferences
    - Parse user preference response into a `PreferenceFilter` object
    - Filter plans client-side: speed keywords → filter by `downloadSpeedMbps`, budget → sort by `monthlyPrice`, contract → filter by `contractLengthMonths`
    - When `showAll` is true or user says "show all plans", display all plans without filtering
    - When no plans match, inform user and suggest broadening criteria or viewing all plans
    - Apply same preference pattern to add-ons with "Show all add-ons" bypass
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

  - [ ]* 8.3 Write property test: preference filtering (Property 4)
    - **Property 4: Preference filtering returns only matching plans**
    - Generate random plan sets and PreferenceFilters, verify all results satisfy filter criteria; when showAll is true, result equals full set
    - **Validates: Requirements 3.3, 3.5, 3.6**

- [x] 9. Implement plan feature and installation date query support
  - [x] 9.1 Add plan feature query handling to guided flow
    - In `processGuidedFlowMessage`, at `summary` and `plan` steps, detect plan feature query patterns ("features", "details", "what does this plan include", "tell me more")
    - At `summary` step: respond with selected plan's full attributes (name, speeds, tech, contract, price, promo, router, activation fee, speed guarantee, out-of-contract price) and re-show summary action chips
    - At `plan` step: respond with details of mentioned or displayed plans
    - When no plan selected/displayed: inform user and suggest selecting a plan first
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 9.2 Add installation date query handling to guided flow
    - Detect installation date query keywords ("installation", "install date", "book installation", "appointment", "engineer visit") at any guided flow step and in non-guided chat
    - When no active order/session: inform user to complete purchase first
    - When active: call `apiClient.getAvailableSlots()`, display as bulleted list with selectable chips
    - On slot selection: call `apiClient.bookAppointment()`, confirm booking details (date, time range, status)
    - On "check my installation": call `apiClient.getAppointment()`, display appointment details
    - On error or unavailable slot: inform user and suggest alternative slots
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 9.3 Write property test: plan feature response (Property 5)
    - **Property 5: Plan feature response contains all key attributes**
    - Generate random BroadbandPlan objects and feature query strings, verify response contains name, download speed, upload speed, tech type, contract length, monthly price
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 10. Remove frontend catalog fetches and per-product promotion calls
  - [x] 10.1 Clean up AiChatPanel product display to use backend response context
    - Stop making per-product promotion fetches (`GET /api/promotions/product/{id}`) for displayed products
    - Use product data included in the backend chat response context instead
    - _Requirements: 6.3, 6.5_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Backend tasks (1, 3) must be completed before frontend proxy migration (5)
- Frontend property tests use `fast-check`; backend property tests use `jqwik`
