# Requirements Document

## Introduction

Improve the broadband purchase journey within the AI chat panel. The current guided broadband flow in the chat has several UX issues: addresses are displayed as plain numbered text instead of a formatted list, only a subset of found addresses are shown as selectable options, all broadband plans are fetched and displayed at once without considering user preferences, the AI cannot answer questions about a selected plan's features, the AI cannot handle installation date queries (instead deflecting users to customer support), and the frontend chat route completely bypasses the backend RAG pipeline by fetching the entire product catalog and calling Gemini directly instead of proxying to the backend ChatController. Additionally, the RAG ingestion pipeline is broken: running POST /api/rag/ingest results in 0 of 109 items ingested because rapid-fire Gemini embedding API calls hit rate limits, causing all embedding requests to fail and leaving the knowledge_documents vector store completely empty. Without ingested data, the RAG pipeline has nothing to search against and falls back to full-catalog responses. This spec addresses these seven issues to create a smarter, more user-friendly, and architecturally sound broadband chat experience.

## Glossary

- **Chat_Panel**: The AiChatPanel React component that renders the AI chat interface, handles user messages, and orchestrates the guided broadband flow.
- **Guided_Flow**: The step-by-step broadband purchase conversation within the Chat_Panel that walks the user through postcode entry, address selection, plan selection, add-ons, and order summary.
- **Address_List**: The list of addresses returned by the address lookup API after the user enters a postcode.
- **Address_Chip**: A suggested action chip rendered in the chat that represents a selectable address from the Address_List.
- **Plan_Preference_Prompt**: A conversational step where the AI asks the user about their broadband preferences (speed, budget, contract length) before fetching or filtering plans.
- **Preference_Filter**: The set of user-stated preferences (speed range, maximum budget, contract length, usage type) used to filter or rank broadband plans.
- **Plan_Detail_Query**: A user message asking about the features, specs, or details of a currently selected or recently shown broadband plan.
- **AI_Advisor**: The backend BroadbandAiAdvisorService and the frontend prompt logic that together generate AI responses about broadband plans.
- **System_Prompt**: The instruction text sent to the AI model that defines its behaviour, available data, and response format.
- **Appointment_Service**: The backend AppointmentService that manages installation appointments, including fetching available slots, booking slots, and retrieving appointment details.
- **Installation_Date_Query**: A user message asking about installation dates, appointment scheduling, or confirmation of an existing installation appointment (e.g., "confirm installation on 5 Apr", "when is my installation", "book an installation date").
- **Frontend_Chat_Route**: The Next.js API route at src/app/api/chat/route.ts that handles chat messages from the Chat_Panel and forwards them to the AI model.
- **Backend_Chat_Endpoint**: The backend POST /api/chat endpoint served by the ChatController, which processes chat messages through the RAG pipeline (RagService, EmbeddingService, pgvector similarity search) before generating AI responses.
- **RAG_Pipeline**: The Retrieval-Augmented Generation pipeline on the backend consisting of RagService, EmbeddingService, and pgvector similarity search, which retrieves only the most relevant product context for a given user query instead of sending the entire catalog.
- **Ingestion_Pipeline**: The backend process triggered by POST /api/rag/ingest that reads products and broadband plans from the database, generates embeddings via the Gemini embedding API, and inserts the resulting vectors into the knowledge_documents table in Supabase.
- **Vector_Store**: The knowledge_documents table in Supabase that stores embedded document vectors used by the RAG_Pipeline for similarity search.
- **Embedding_API**: The Gemini embedding API used by the Ingestion_Pipeline to convert product and plan text into vector embeddings.
- **Ingestion_Health_Check**: An endpoint or startup check that verifies the Vector_Store contains data and reports the document count.

## Requirements

### Requirement 1: Bulleted List Formatting for All List Content

**User Story:** As a customer, I want any list of items shown in the chat (addresses, plans, add-ons, features, appointment slots, etc.) to be displayed as a clearly formatted bulleted list, so that I can easily read and distinguish between items.

#### Acceptance Criteria

1. WHEN the AI response contains a list of items (addresses, broadband plans, add-ons, plan features, appointment slots, or any other enumerable content), THE Chat_Panel SHALL display each item as a bulleted list item (using bullet point characters) instead of plain numbered text or inline comma-separated text.
2. WHEN the Chat_Panel renders a bulleted list, each item SHALL appear on its own line with consistent indentation and spacing.
3. WHEN the Chat_Panel renders a bulleted list, the message preceding the list SHALL include the total count of items where applicable (e.g., "I found 8 addresses", "Here are 3 available plans").
4. THE System_Prompt SHALL instruct the AI to format any list of 2 or more items using bullet points (e.g., markdown list syntax) rather than inline or numbered text.

### Requirement 2: Display All Addresses from Lookup

**User Story:** As a customer, I want to see all addresses found for my postcode, so that I can select the correct one even if there are many results.

#### Acceptance Criteria

1. WHEN the address lookup returns results, THE Chat_Panel SHALL display every address in the Address_List regardless of the total count.
2. WHEN the address lookup returns results, THE Chat_Panel SHALL render a selectable Address_Chip for every address in the Address_List, not a limited subset.
3. WHEN the Address_List contains more than 6 addresses, THE Chat_Panel SHALL still render all Address_Chips, allowing the chip container to wrap or scroll as needed.
4. THE Chat_Panel SHALL accept a numeric selection from 1 up to the total number of addresses in the Address_List.

### Requirement 3: Preference-Based Plan Filtering

**User Story:** As a customer, I want the AI to ask me about my broadband preferences before showing plans, so that I only see plans relevant to my needs instead of being overwhelmed by all available options.

#### Acceptance Criteria

1. WHEN the user selects an address and broadband plans are available, THE Guided_Flow SHALL prompt the user with a Plan_Preference_Prompt asking about their preferences (speed needs, budget, contract length, or usage type) before displaying plans.
2. THE Plan_Preference_Prompt SHALL offer a "Show all plans" option as a suggested action chip so the user can bypass preference filtering.
3. WHEN the user provides preferences, THE Guided_Flow SHALL filter the available plans using the stated Preference_Filter criteria and display only matching plans.
4. WHEN the user provides preferences and no plans match the Preference_Filter, THE Guided_Flow SHALL inform the user that no plans match and suggest broadening the criteria or viewing all plans.
5. WHEN the user explicitly requests to "show all plans" or "show all available plans", THE Guided_Flow SHALL display all available plans without filtering.
6. THE Guided_Flow SHALL apply the same preference-based filtering logic to add-ons: asking the user about add-on preferences before displaying all add-ons, with a "Show all add-ons" bypass option.

### Requirement 4: Plan Feature Inquiry Support

**User Story:** As a customer, I want to ask the AI about the features of a selected or displayed broadband plan and receive a detailed answer, so that I can make an informed decision without leaving the chat.

#### Acceptance Criteria

1. WHEN the user asks about the features or details of a currently selected plan during the Guided_Flow summary step, THE Chat_Panel SHALL respond with the plan's key attributes (name, download speed, upload speed, technology type, contract length, monthly price, promotional label, router details, activation fee, speed guarantee, and out-of-contract price).
2. WHEN the user asks about a plan's features during the Guided_Flow summary step, THE Chat_Panel SHALL include the plan details in the response message and continue to offer the existing summary step actions (Add to cart, Go back, Start over).
3. WHEN the user asks about a plan's features during the plan selection step, THE Chat_Panel SHALL respond with the relevant plan details from the plans currently displayed.
4. IF the user asks about plan features when no plan has been selected or displayed, THEN THE Chat_Panel SHALL inform the user that no plan is currently selected and suggest selecting a plan first.
5. THE System_Prompt SHALL include instructions for the AI to recognise Plan_Detail_Query messages (e.g., "tell me its features", "what does this plan include", "plan details") and respond with structured plan information rather than repeating the cart prompt.

### Requirement 5: Installation Date Query Support

**User Story:** As a customer, I want to ask the AI chat about my installation date or schedule an installation appointment, so that I can manage my broadband installation without being redirected to customer support.

#### Acceptance Criteria

1. WHEN the user asks about available installation dates, THE Chat_Panel SHALL retrieve available appointment slots from the Appointment_Service and present them as a list of selectable dates with time ranges (morning or afternoon).
2. WHEN the user requests to book a specific installation date and time slot, THE Chat_Panel SHALL call the Appointment_Service to book the selected slot and confirm the booking details (date, time range, and appointment status) in the chat response.
3. WHEN the user asks to confirm or check an existing installation appointment, THE Chat_Panel SHALL retrieve the appointment details from the Appointment_Service and display the appointment date, time slot, and current status.
4. IF the user asks about installation dates but has no active order or session, THEN THE Chat_Panel SHALL inform the user that an order is required before scheduling an installation and suggest completing the broadband purchase first.
5. IF the Appointment_Service returns an error or the requested slot is unavailable, THEN THE Chat_Panel SHALL inform the user that the slot could not be booked and suggest selecting an alternative available slot.
6. THE System_Prompt SHALL include instructions for the AI to recognise Installation_Date_Query messages (e.g., "confirm installation on 5 Apr", "when is my installation", "book installation", "available installation dates") and route them to the Appointment_Service rather than deflecting to customer support.


### Requirement 6: Proxy Chat Through Backend RAG Endpoint

**User Story:** As a developer, I want the frontend chat route to proxy messages to the backend RAG-enabled chat endpoint instead of calling Gemini directly with the entire product catalog, so that the RAG pipeline is activated, token usage is reduced, and duplicate API calls are eliminated.

#### Acceptance Criteria

1. WHEN the Chat_Panel sends a chat message, THE Frontend_Chat_Route SHALL forward the message to the Backend_Chat_Endpoint (POST /api/chat) instead of calling the Gemini SDK directly.
2. WHEN the Frontend_Chat_Route receives a response from the Backend_Chat_Endpoint, THE Frontend_Chat_Route SHALL return the response to the Chat_Panel without modification to the response structure.
3. THE Frontend_Chat_Route SHALL stop fetching the full product catalog, promotions, bundles, and coupon mappings from the backend REST APIs (GET /api/products, GET /api/promotions, GET /api/bundles/active, GET /api/promotions/coupon-product-mappings) on each chat request.
4. THE Frontend_Chat_Route SHALL stop constructing a system prompt via createShoppingAssistantPrompt that embeds the entire product catalog as token content.
5. WHEN the Chat_Panel displays products returned by the AI response, THE Chat_Panel SHALL use the product data included in the Backend_Chat_Endpoint response context and SHALL stop making per-product promotion fetches (GET /api/promotions/product/{id}) for each displayed product.
6. THE Frontend_Chat_Route SHALL forward conversation history and cart context to the Backend_Chat_Endpoint so that the RAG_Pipeline can generate contextually relevant responses.
7. IF the Backend_Chat_Endpoint returns an error or is unreachable, THEN THE Frontend_Chat_Route SHALL return a user-friendly error message to the Chat_Panel indicating that the chat service is temporarily unavailable.
8. WHEN the Backend_Chat_Endpoint processes a product-related query, THE RAG_Pipeline SHALL retrieve only the relevant product context via similarity search instead of including all products in the prompt.


### Requirement 7: Fix Embedding API Version and Harden RAG Ingestion Pipeline

**User Story:** As a developer, I want the RAG ingestion pipeline to use the correct Gemini embedding API version, handle rate limits gracefully, and verify the vector store is populated, so that embeddings are generated successfully, the RAG pipeline always has data to search against, and ingestion failures are detected early.

#### Acceptance Criteria

1. THE EmbeddingService SHALL use the `gemini-embedding-001` model (instead of the currently configured `text-embedding-004` which does not exist for this API key and returns HTTP 404 on every call) and SHALL call the Gemini embedding API using the `v1` API version (i.e., `https://generativelanguage.googleapis.com/v1/models/gemini-embedding-001:embedContent`) instead of `v1beta`. The default embedding model in `application.properties` SHALL be updated from `text-embedding-004` to `gemini-embedding-001`.
2. WHEN the Ingestion_Pipeline sends embedding requests to the Embedding_API, THE Ingestion_Pipeline SHALL insert a configurable delay (default 200ms) between each embedding API call to avoid exceeding Gemini rate limits.
3. WHEN the Ingestion_Pipeline processes items for embedding, THE Ingestion_Pipeline SHALL process items in configurable batch sizes (default 10 items per batch) with a configurable pause (default 2 seconds) between batches.
4. IF an embedding API call fails with a rate-limit error (HTTP 429) or a transient server error (HTTP 5xx), THEN THE Ingestion_Pipeline SHALL retry the failed call using exponential backoff with a maximum of 3 retries per item.
5. IF an embedding API call fails after exhausting all retries, THEN THE Ingestion_Pipeline SHALL log the item identifier, the error response status code, and the error response body, and continue processing the remaining items.
6. WHEN the Ingestion_Pipeline completes a run, THE Ingestion_Pipeline SHALL log a summary reporting the total items attempted, the number successfully ingested, and the number that failed.
7. WHEN the application starts, THE Ingestion_Pipeline SHALL query the Vector_Store for the current document count and, if the count is zero, automatically trigger a full ingestion run.
8. THE Ingestion_Health_Check SHALL expose a GET endpoint (e.g., GET /api/rag/health) that returns the current document count in the Vector_Store and a status of "healthy" when the count is greater than zero or "empty" when the count is zero.
9. IF the Ingestion_Health_Check reports a status of "empty", THEN THE Ingestion_Health_Check SHALL include a warning message indicating that the RAG_Pipeline has no data to search against.
10. WHEN the Ingestion_Pipeline retries a failed embedding call, THE Ingestion_Pipeline SHALL log each retry attempt with the retry number, the wait duration before the next attempt, and the error that triggered the retry.
11. THE Ingestion_Pipeline SHALL capture and log the full error response body from the Embedding_API for every failed call, including the HTTP status code, error message, and any rate-limit headers (e.g., Retry-After).
