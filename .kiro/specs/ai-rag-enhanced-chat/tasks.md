# Implementation Plan: AI RAG-Enhanced Chat

## Overview

Enhance the AI shopping assistant with RAG (Retrieval Augmented Generation) backed by Supabase pgvector. The implementation proceeds bottom-up: database schema → backend embedding/ingestion services → RAG retrieval pipeline → chat API integration → frontend summary cards, suggestion chips, and guided broadband flow. Java (Spring Boot) for backend, TypeScript (React/Next.js) for frontend.

## Tasks

- [x] 1. Set up pgvector schema and knowledge_documents table
  - [x] 1.1 Create SQL migration script `scripts/rag-schema.sql`
    - Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector`
    - Create `knowledge_documents` table with columns: id (UUID PK), content (TEXT), metadata (JSONB), embedding (VECTOR(768)), created_at (TIMESTAMPTZ)
    - Create IVFFlat index on embedding column with `vector_cosine_ops`
    - Create index on `metadata->>'source_type'` for filtering
    - Create unique index on `(metadata->>'source_type', metadata->>'source_id')` to prevent duplicates
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [x] 2. Implement backend RAG models and EmbeddingService
  - [x] 2.1 Create backend model classes
    - Create `KnowledgeDocument.java` in `com.shoppingagent.model` with fields: id, content, metadata (Map), embedding (float[]), relevanceScore (double), createdAt
    - Create `RagContext.java` with fields: contextWindow (String), sourceIds (List<String>), documentCount (int)
    - Create `IngestionResult.java` with fields: totalIngested, failures, timestamp, failedSourceIds
    - Create `RagStatus.java` with fields: totalDocuments, lastIngestionTimestamp, pendingQueueItems
    - Create `EmbeddingException.java` in `com.shoppingagent.exception`
    - _Requirements: 1.2, 1.4, 1.5_

  - [x] 2.2 Implement `EmbeddingService.java`
    - Create service in `com.shoppingagent.service` that calls Gemini `embedContent` API (text-embedding-004)
    - Use `gemini.embedding.model` config property (default: `text-embedding-004`)
    - Implement `generateEmbedding(String text)` returning `float[768]`
    - Use HttpClient with 5-second timeout
    - Throw `EmbeddingException` on API failure
    - _Requirements: 2.2_

  - [ ]* 2.3 Write property test for embedding dimensionality
    - **Property 2: Embedding dimensionality**
    - **Validates: Requirements 2.2**

- [x] 3. Implement IngestionService and RagController
  - [x] 3.1 Implement `IngestionService.java`
    - Create service in `com.shoppingagent.service`
    - Implement `ingestAll()` that reads all products from `ProductService` and broadband plans via `SupabaseClient`, generates embeddings, and upserts into `knowledge_documents`
    - Build content strings matching the design format (product: name, brand, category, price, description, specs, rating; broadband: plan name, speeds, technology, contract, price, promo label)
    - Upsert by matching on `metadata->>'source_type'` and `metadata->>'source_id'`
    - Implement `upsertDocument(sourceType, sourceId, content, metadata)` for single-document updates
    - Implement `deleteDocument(sourceType, sourceId)` for removals
    - Log failures with source_id and continue processing remaining documents
    - Return `IngestionResult` with totalIngested, failures count, and failedSourceIds
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 3.2 Write property test for ingested document content completeness
    - **Property 1: Ingested document content completeness**
    - **Validates: Requirements 1.4, 1.5**

  - [ ]* 3.3 Write property test for ingestion idempotence
    - **Property 3: Ingestion idempotence**
    - **Validates: Requirements 2.3**

  - [ ]* 3.4 Write property test for ingestion resilience and reporting
    - **Property 4: Ingestion resilience and reporting**
    - **Validates: Requirements 2.6, 2.7**

  - [x] 3.5 Implement `RagController.java`
    - Create REST controller at `/api/rag`
    - `POST /api/rag/ingest` → calls `IngestionService.ingestAll()`, returns `IngestionResult`
    - `GET /api/rag/status` → queries `knowledge_documents` count and last ingestion timestamp, returns `RagStatus`
    - _Requirements: 2.4, 9.5_

- [x] 4. Checkpoint - Ensure ingestion pipeline compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement RagService (retrieval and context assembly)
  - [x] 5.1 Add RAG configuration properties to `application.properties`
    - Add `rag.top-k=5`, `rag.relevance-threshold=0.3`, `rag.max-context-tokens=2000`
    - Add `gemini.embedding.model=text-embedding-004`
    - _Requirements: 8.7_

  - [x] 5.2 Implement `RagService.java`
    - Create service in `com.shoppingagent.service`
    - Implement `retrieveContext(String userQuery)` as the main entry point returning `RagContext`
    - Generate query embedding via `EmbeddingService`
    - Execute similarity search SQL against `knowledge_documents` using cosine distance, with configurable top-K
    - Filter results by relevance threshold
    - Order results by relevance score descending
    - Assemble context window: concatenate content fields prefixed with source_type labels, include source_id values
    - Truncate context window to max token count, removing lowest-scored documents first
    - Implement intent detection to exclude non-matching source_types when intent is unambiguous
    - Return `null` on any failure (embedding failure, search timeout >3s, empty vector store) and log the error
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.1, 10.2, 10.3_

  - [ ]* 5.3 Write property test for similarity search top-K limit
    - **Property 5: Similarity search respects top-K limit**
    - **Validates: Requirements 3.2, 8.1**

  - [x] 5.4 Write property test for relevance threshold filtering
    - **Property 6: Relevance threshold filtering**
    - **Validates: Requirements 3.3, 8.2**

  - [ ]* 5.5 Write property test for context assembly metadata
    - **Property 7: Context assembly includes source metadata**
    - **Validates: Requirements 3.4, 3.5, 3.6, 8.5**

  - [x] 5.6 Write property test for context window token limit
    - **Property 8: Context window token limit**
    - **Validates: Requirements 3.8**

  - [ ]* 5.7 Write property test for context ordering
    - **Property 9: Context ordering by relevance**
    - **Validates: Requirements 8.3**

  - [ ]* 5.8 Write property test for truncation behavior
    - **Property 10: Truncation removes lowest-scoring first**
    - **Validates: Requirements 8.4**

- [x] 6. Integrate RAG into ChatController and GeminiService
  - [x] 6.1 Extend `ChatResponse.java` with new optional fields
    - Add `summaryCards` (List<SummaryCard>) and `suggestedActions` (List<String>) fields
    - Create `SummaryCard.java` model with fields: type, id, name, price, brand, rating, downloadSpeed, uploadSpeed, monthlyPrice, contractLength, promotionalLabel
    - Maintain backward compatibility — existing fields (action, payload, message) unchanged
    - _Requirements: 4.5, 5.1, 5.2, 6.5_

  - [x] 6.2 Modify `GeminiService.java` to support RAG context
    - Add `chatWithContext(ChatRequest request, RagContext ragContext)` method
    - When `ragContext` is non-null, inject a "RELEVANT CONTEXT" section into the system prompt with retrieved documents instead of full product catalog
    - When `ragContext` is null, use existing `buildSystemPrompt()` (full-catalog fallback)
    - Update prompt to instruct LLM to include `summaryCards` and `suggestedActions` in JSON response
    - Parse new fields from Gemini response
    - _Requirements: 4.3, 4.5, 10.1_

  - [x] 6.3 Modify `ChatController.java` to use RagService
    - Inject `RagService` into `ChatController`
    - In the `chat()` method, call `ragService.retrieveContext(request.getMessage())`
    - If `RagContext` is non-null, call `geminiService.chatWithContext(request, ragContext)`
    - If `RagContext` is null (RAG failure/fallback), call existing `geminiService.chat(request)` and log warning
    - Resolve short IDs (p0, p1…) to real UUIDs using source_id values from RagContext
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 6.4 Write property test for short ID resolution
    - **Property 11: Short ID resolution**
    - **Validates: Requirements 4.4**

  - [ ]* 6.5 Write property test for response format backward compatibility
    - **Property 12: Response format backward compatibility**
    - **Validates: Requirements 4.5**

- [x] 7. Implement embedding refresh on data changes
  - [x] 7.1 Add re-embedding hooks for product and broadband plan changes
    - In relevant service methods (product create/update, broadband plan create/update), call `IngestionService.upsertDocument()` to queue re-embedding
    - On product/broadband plan deletion or deactivation, call `IngestionService.deleteDocument()` to remove the knowledge document
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 7.2 Write property test for catalog change re-embedding
    - **Property 21: Catalog change triggers re-embedding**
    - **Validates: Requirements 2.5, 9.1, 9.2**

  - [ ]* 7.3 Write property test for deletion removes knowledge document
    - **Property 22: Deletion removes knowledge document**
    - **Validates: Requirements 9.4**

- [x] 8. Checkpoint - Ensure backend RAG pipeline compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement SummaryCard frontend component
  - [x] 9.1 Create `SummaryCard.tsx` in `src/components/`
    - Define `SummaryCardProps` interface with type ('product' | 'broadband'), data, and onAction callback
    - Product cards: render name, price, brand, rating, "Add to Cart" button
    - Broadband cards: render plan name, download/upload speed, monthly price, contract length, "Select Plan" button
    - Display promotional label badge when present
    - Use consistent styling matching existing card-based UI patterns (border radius, padding, colour scheme)
    - _Requirements: 5.1, 5.2, 5.5, 5.7_

  - [x] 9.2 Write property test for summary card field completeness
    - **Property 13: Summary card field completeness**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 9.3 Write property test for summary card action dispatch
    - **Property 14: Summary card action dispatch**
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 9.4 Write property test for promotional label display
    - **Property 15: Promotional label display**
    - **Validates: Requirements 5.5**

- [x] 10. Implement SuggestionChip frontend component
  - [x] 10.1 Create `SuggestionChip.tsx` in `src/components/`
    - Define `SuggestionChipProps` interface with label (string) and onClick callback
    - Clicking a chip calls `onClick(label)` which sends the label as a new user message
    - Style as a clickable chip matching the application's design system
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 10.2 Write property test for suggestion chip click sends message
    - **Property 17: Suggestion chip click sends message**
    - **Validates: Requirements 6.3**

- [x] 11. Integrate SummaryCards and SuggestionChips into AiChatPanel
  - [x] 11.1 Update `AiChatPanel.tsx` to render SummaryCards
    - Parse `summaryCards` from chat response JSON
    - Render up to 3 SummaryCards per AI response
    - Wire "Add to Cart" button to dispatch `add_to_cart` action with product ID
    - Wire "Select Plan" button to dispatch `add_broadband_to_cart` action with plan ID
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [x] 11.2 Update `AiChatPanel.tsx` to render SuggestionChips
    - Parse `suggestedActions` from chat response JSON
    - Render 2-4 SuggestionChips per response
    - When `suggestedActions` is absent, generate default chips based on detected query category (product vs broadband)
    - Clicking a chip sends the label text as a new user message
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 11.3 Write property test for max 3 summary cards per response
    - **Property 16: Max 3 summary cards per response**
    - **Validates: Requirements 5.6**

  - [ ]* 11.4 Write property test for suggestion chip count bounds
    - **Property 18: Suggestion chip count bounds**
    - **Validates: Requirements 6.4**

  - [ ]* 11.5 Write property test for default suggestion chips fallback
    - **Property 19: Default suggestion chips fallback**
    - **Validates: Requirements 6.6**

  - [ ]* 11.6 Write property test for chat panel renders regardless of source
    - **Property 23: Chat panel renders regardless of source**
    - **Validates: Requirements 10.4**

- [x] 12. Implement Guided Broadband Flow in AiChatPanel
  - [x] 12.1 Add GuidedFlowState management to `AiChatPanel.tsx`
    - Define `GuidedFlowState` interface with: active, currentStep ('postcode' | 'address' | 'plan' | 'addons' | 'summary'), postcode, selectedAddress, selectedPlan, selectedAddons
    - Add `useState<GuidedFlowState>` to AiChatPanel
    - Detect broadband availability/purchase queries to initiate the guided flow
    - _Requirements: 7.1, 7.6_

  - [x] 12.2 Implement guided flow step handlers
    - Postcode step: prompt user for postcode, call address lookup API, present matching addresses as selectable options in chat
    - Address step: on address selection, call eligibility and products APIs, present available broadband plans as SummaryCards
    - Plan step: on plan selection, present available add-ons as SuggestionChips or SummaryCards
    - Summary step: display pricing summary message with selected plan, add-ons, and total monthly cost
    - Support "go back" to reset flow to a previous step and clear subsequent selections
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.7_

  - [x] 12.3 Add error handling for guided flow API calls
    - Display error message in chat when address lookup, eligibility, or products API fails
    - Offer a "Try again" SuggestionChip on error
    - _Requirements: 10.5_

  - [ ]* 12.4 Write property test for guided flow state machine validity
    - **Property 20: Guided flow state machine validity**
    - **Validates: Requirements 7.6, 7.7**

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Backend property tests use jqwik; frontend property tests use fast-check
- The existing `/api/chat` request format and core response fields remain backward-compatible throughout
