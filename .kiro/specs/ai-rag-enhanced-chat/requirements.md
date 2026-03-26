# Requirements Document

## Introduction

Enhance the existing AI shopping assistant chat to deliver precise, context-aware responses for product and broadband queries using Retrieval Augmented Generation (RAG) backed by Supabase pgvector. Instead of injecting the entire product catalog and broadband plan list into every prompt, the system embeds product and broadband data into vector storage and retrieves only the most relevant items per user query. The chat UI is also enhanced with structured summary cards and guided suggestion chips that mirror the broadband purchase journey steps, so users can complete key actions directly from the chat panel.

## Glossary

- **RAG_Pipeline**: The backend service that receives a user query, generates an embedding, performs a similarity search against the vector store, and assembles a context-limited prompt for the LLM.
- **Embedding_Service**: The backend component responsible for converting text (product descriptions, broadband plan details, user queries) into vector embeddings using a configured embedding model.
- **Vector_Store**: The Supabase PostgreSQL table with a pgvector column that stores pre-computed embeddings for products, broadband plans, and knowledge base documents.
- **Similarity_Search**: A database query that uses pgvector cosine distance to find the top-K most relevant documents for a given query embedding.
- **Knowledge_Document**: A row in the Vector_Store representing a chunk of searchable content (product info, broadband plan details, FAQ entry, or policy text) with its associated embedding vector and metadata.
- **Chat_Panel**: The existing AiChatPanel React component that provides the conversational UI for the AI assistant.
- **Summary_Card**: A structured UI card rendered inside the Chat_Panel that displays a concise summary of a product or broadband plan with key attributes and an action button (e.g., "Add to Cart", "Select Plan").
- **Suggestion_Chip**: A clickable chip rendered below an AI response that offers a contextual next step (e.g., "Compare plans", "Check availability", "View add-ons").
- **Context_Window**: The assembled set of retrieved Knowledge_Documents that is injected into the LLM prompt as grounding context for a single user query.
- **Relevance_Score**: The cosine similarity score returned by pgvector for each retrieved document, used to filter out low-relevance results.
- **Chat_Session**: The stateful conversation between a user and the AI assistant within a single browser session, including message history and accumulated context.
- **Guided_Flow**: A sequence of Suggestion_Chips that mirrors the broadband purchase journey steps (postcode entry, address selection, plan selection, add-ons, summary) presented within the Chat_Panel.
- **Ingestion_Pipeline**: The process that reads product and broadband data from the database, generates embeddings, and upserts them into the Vector_Store.
- **LLM**: The Gemini large language model used to generate conversational responses.
- **Backend**: The Java Spring Boot backend service.
- **Database**: The Supabase PostgreSQL database with the pgvector extension enabled.

## Requirements

### Requirement 1: Vector Store Schema and pgvector Setup

**User Story:** As a developer, I want a pgvector-enabled table in Supabase to store embeddings for products and broadband plans, so that the RAG pipeline can perform fast similarity searches.

#### Acceptance Criteria

1. THE Database SHALL have the pgvector extension enabled via `CREATE EXTENSION IF NOT EXISTS vector`.
2. THE Database SHALL contain a `knowledge_documents` table with columns: id (UUID, primary key), content (TEXT, the human-readable chunk text), metadata (JSONB, containing source_type, source_id, and additional attributes), embedding (VECTOR(768), the embedding vector), and created_at (TIMESTAMPTZ, default now()).
3. THE Database SHALL have an IVFFlat or HNSW index on the embedding column of the `knowledge_documents` table to accelerate similarity searches.
4. THE `knowledge_documents` table SHALL store one row per product containing the product name, description, brand, category, price, specs, and rating as the content field, with metadata.source_type set to "product" and metadata.source_id set to the product UUID.
5. THE `knowledge_documents` table SHALL store one row per broadband plan containing the plan name, download speed, upload speed, technology type, contract length, monthly price, and promotional label as the content field, with metadata.source_type set to "broadband_plan" and metadata.source_id set to the plan UUID.
6. THE `knowledge_documents` table SHALL support additional source_type values ("faq", "policy") for future knowledge base expansion.

### Requirement 2: Embedding Generation and Data Ingestion

**User Story:** As a developer, I want an ingestion pipeline that generates embeddings for all products and broadband plans and stores them in the vector store, so that the data is searchable via similarity queries.

#### Acceptance Criteria

1. THE Ingestion_Pipeline SHALL read all active products from the products table and all active broadband plans from the broadband_plans table.
2. THE Embedding_Service SHALL generate a 768-dimensional embedding vector for each Knowledge_Document content string using the Gemini embedding model (text-embedding-004 or equivalent).
3. THE Ingestion_Pipeline SHALL upsert Knowledge_Documents into the `knowledge_documents` table, matching on metadata.source_type and metadata.source_id to avoid duplicates.
4. THE Ingestion_Pipeline SHALL be executable as a backend API endpoint (POST /api/rag/ingest) so that an administrator can trigger re-ingestion after catalog changes.
5. WHEN a product or broadband plan is added or updated in the source tables, THE Ingestion_Pipeline SHALL generate a new embedding and upsert the corresponding Knowledge_Document.
6. IF the embedding model API call fails for a specific document, THEN THE Ingestion_Pipeline SHALL log the failure with the document source_id and continue processing remaining documents.
7. THE Ingestion_Pipeline SHALL report the total number of documents ingested and the number of failures upon completion.

### Requirement 3: RAG Retrieval and Context Assembly

**User Story:** As a user, I want the AI assistant to retrieve only the most relevant product and broadband information for my query, so that responses are accurate and not cluttered with irrelevant data.

#### Acceptance Criteria

1. WHEN a user sends a chat message, THE RAG_Pipeline SHALL generate an embedding for the user query using the same Embedding_Service.
2. THE RAG_Pipeline SHALL perform a Similarity_Search against the Vector_Store using cosine distance, retrieving the top-K most similar Knowledge_Documents (default K=5).
3. THE RAG_Pipeline SHALL filter out any retrieved Knowledge_Document with a Relevance_Score below a configurable threshold (default 0.3).
4. THE RAG_Pipeline SHALL assemble a Context_Window by concatenating the content fields of the retrieved Knowledge_Documents, prepended with their source_type labels.
5. THE RAG_Pipeline SHALL inject the Context_Window into the LLM prompt as a "RELEVANT CONTEXT" section, placed before the user message.
6. THE RAG_Pipeline SHALL include the metadata.source_id values in the context so the LLM can reference specific product or plan IDs in its response actions.
7. WHEN the Similarity_Search returns zero results above the threshold, THE RAG_Pipeline SHALL fall back to the existing full-catalog prompt approach for that query.
8. THE RAG_Pipeline SHALL limit the total Context_Window size to a configurable maximum token count (default 2000 tokens) to prevent prompt bloat.

### Requirement 4: RAG-Aware Chat API Endpoint

**User Story:** As a frontend developer, I want the chat API to use RAG retrieval transparently, so that the Chat_Panel receives more relevant and concise AI responses without changes to the request format.

#### Acceptance Criteria

1. THE existing POST /api/chat endpoint SHALL integrate the RAG_Pipeline to retrieve relevant context before calling the LLM.
2. THE POST /api/chat endpoint SHALL accept the same request body format (message, history, cartItems, appliedCouponCode, broadbandPlans) to maintain backward compatibility.
3. THE POST /api/chat endpoint SHALL pass the RAG-assembled Context_Window to the LLM prompt instead of the full product catalog when relevant documents are found.
4. THE POST /api/chat endpoint SHALL continue to resolve short IDs (p0, p1…) to real UUIDs in the response, using the source_id values from retrieved Knowledge_Documents.
5. THE POST /api/chat response JSON format SHALL remain unchanged: actions array, suggestions array, message string, and optional comparison object.
6. WHEN the RAG retrieval fails or times out, THE POST /api/chat endpoint SHALL fall back to the existing full-catalog prompt and log a warning.

### Requirement 5: Structured Summary Cards in Chat Responses

**User Story:** As a customer, I want to see structured product and broadband plan cards in the AI chat, so that I can quickly understand recommendations and take action without leaving the chat.

#### Acceptance Criteria

1. WHEN the AI recommends a product, THE Chat_Panel SHALL render a Summary_Card displaying the product name, price, brand, rating, and an "Add to Cart" action button.
2. WHEN the AI recommends a broadband plan, THE Chat_Panel SHALL render a Summary_Card displaying the plan name, download speed, upload speed, monthly price, contract length, and a "Select Plan" action button.
3. WHEN the user clicks the "Add to Cart" button on a product Summary_Card, THE Chat_Panel SHALL dispatch the add_to_cart action with the product ID.
4. WHEN the user clicks the "Select Plan" button on a broadband Summary_Card, THE Chat_Panel SHALL dispatch the add_broadband_to_cart action with the plan ID.
5. THE Summary_Card SHALL display a promotional label badge when the product or plan has an active promotion.
6. THE Chat_Panel SHALL render a maximum of 3 Summary_Cards per AI response to avoid overwhelming the user.
7. THE Summary_Card SHALL use consistent styling (border radius, padding, colour scheme) that matches the existing card-based UI patterns in the application.

### Requirement 6: Contextual Suggestion Chips

**User Story:** As a customer, I want to see contextual next-step suggestions after each AI response, so that I can continue my journey without having to type follow-up questions.

#### Acceptance Criteria

1. WHEN the AI responds to a broadband-related query, THE Chat_Panel SHALL render Suggestion_Chips relevant to the broadband purchase journey (e.g., "Check availability at my address", "Compare plans", "View add-ons", "See pricing summary").
2. WHEN the AI responds to a product query, THE Chat_Panel SHALL render Suggestion_Chips relevant to shopping actions (e.g., "Compare with similar", "Add to cart", "Show deals", "View specs").
3. WHEN the user clicks a Suggestion_Chip, THE Chat_Panel SHALL send the chip label text as a new user message to the chat.
4. THE Chat_Panel SHALL render between 2 and 4 Suggestion_Chips per AI response.
5. THE LLM response JSON SHALL include an optional `suggestedActions` array of strings that the Chat_Panel uses to render Suggestion_Chips.
6. WHEN the LLM does not provide `suggestedActions`, THE Chat_Panel SHALL generate default Suggestion_Chips based on the detected query category (product or broadband).

### Requirement 7: Guided Broadband Flow in Chat

**User Story:** As a customer, I want the AI chat to guide me through the broadband purchase steps with the same flow as the main journey page, so that I can complete a broadband purchase entirely within the chat.

#### Acceptance Criteria

1. WHEN the user asks about broadband availability or purchasing broadband, THE Chat_Panel SHALL initiate a Guided_Flow starting with a prompt to enter a postcode.
2. WHEN the user provides a postcode in the Guided_Flow, THE Chat_Panel SHALL call the address lookup API and present matching addresses as selectable options within the chat.
3. WHEN the user selects an address in the Guided_Flow, THE Chat_Panel SHALL call the eligibility and products APIs and present available broadband plans as Summary_Cards.
4. WHEN the user selects a broadband plan in the Guided_Flow, THE Chat_Panel SHALL present available add-ons as Suggestion_Chips or Summary_Cards.
5. WHEN the user completes all selections in the Guided_Flow, THE Chat_Panel SHALL display a pricing summary message showing the selected plan, add-ons, and total monthly cost.
6. THE Guided_Flow SHALL track the current step (postcode, address, plan, addons, summary) in the Chat_Session state so the AI can provide step-appropriate responses.
7. WHEN the user asks to go back to a previous step in the Guided_Flow, THE Chat_Panel SHALL reset the flow to that step and present the appropriate options.

### Requirement 8: Context Limiting and Relevance Filtering

**User Story:** As a system operator, I want the RAG pipeline to strictly limit the context sent to the LLM, so that responses are focused, token costs are minimized, and irrelevant information is not shared with users.

#### Acceptance Criteria

1. THE RAG_Pipeline SHALL retrieve a maximum of K=5 Knowledge_Documents per query by default.
2. THE RAG_Pipeline SHALL discard any Knowledge_Document whose Relevance_Score is below the configured threshold before including it in the Context_Window.
3. THE RAG_Pipeline SHALL order retrieved Knowledge_Documents by Relevance_Score in descending order within the Context_Window.
4. THE RAG_Pipeline SHALL truncate the Context_Window if the total content exceeds the configured maximum token count, removing the lowest-scoring documents first.
5. THE RAG_Pipeline SHALL tag each context item with its source_type so the LLM can distinguish between product information, broadband plan details, and other knowledge types.
6. THE RAG_Pipeline SHALL exclude Knowledge_Documents whose source_type does not match the detected query intent (e.g., exclude broadband documents for a pure product query) when the intent is unambiguous.
7. THE Backend SHALL expose configuration properties for K value, relevance threshold, and maximum token count so they can be adjusted without code changes.

### Requirement 9: Embedding Refresh on Data Changes

**User Story:** As a developer, I want embeddings to stay in sync with the product and broadband catalogs, so that the RAG pipeline always retrieves up-to-date information.

#### Acceptance Criteria

1. WHEN a product is created or updated via the existing product management APIs, THE Backend SHALL queue the product for re-embedding.
2. WHEN a broadband plan is created or updated, THE Backend SHALL queue the plan for re-embedding.
3. THE Ingestion_Pipeline SHALL process queued items and upsert their updated embeddings into the Vector_Store.
4. WHEN a product or broadband plan is deleted or deactivated, THE Ingestion_Pipeline SHALL delete the corresponding Knowledge_Document from the Vector_Store.
5. THE Backend SHALL provide a GET /api/rag/status endpoint that returns the total document count in the Vector_Store, the last ingestion timestamp, and any pending queue items.

### Requirement 10: Error Handling and Fallback

**User Story:** As a customer, I want the AI chat to continue working even if the RAG system encounters errors, so that my experience is not disrupted.

#### Acceptance Criteria

1. IF the Embedding_Service fails to generate a query embedding, THEN THE RAG_Pipeline SHALL fall back to the existing full-catalog prompt and log the error.
2. IF the Similarity_Search query fails or times out (exceeding 3 seconds), THEN THE RAG_Pipeline SHALL fall back to the existing full-catalog prompt and log the error.
3. IF the Vector_Store contains zero Knowledge_Documents, THEN THE RAG_Pipeline SHALL use the existing full-catalog prompt and log a warning indicating the vector store is empty.
4. THE Chat_Panel SHALL display AI responses without interruption regardless of whether the response was generated via RAG or the fallback full-catalog approach.
5. IF the Guided_Flow encounters an API error at any step, THEN THE Chat_Panel SHALL display an error message within the chat and offer a "Try again" Suggestion_Chip.
