# Implementation Plan: Supabase Integration

## Overview

Migrate the AI Shopping Assistant from hardcoded data and in-memory storage to Supabase (PostgreSQL). This covers database schema setup, a Node.js migration script for CSV import and sample promotions/bundles seeding, Spring Boot backend services using the Supabase REST API, and frontend updates to consume database-sourced data including promotions and bundle deals.

## Tasks

- [x] 1. Set up Supabase schema and configuration
  - [x] 1.1 Create SQL schema file with all tables (products, cart_items, chat_history, promotions, product_promotions, bundles, bundle_items) including indexes and constraints
    - Use the SQL from the design document's Data Models section
    - Include CHECK constraints on discount_type columns
    - Include unique constraints and foreign keys with CASCADE delete
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.1, 7.2, 7.3, 7.4_
  - [x] 1.2 Update environment configuration files
    - Add Supabase URL and API key placeholders to `application.properties.example` and `.env.example`
    - Add `SUPABASE_URL` and `SUPABASE_KEY` entries
    - _Requirements: 6.1, 6.2_

- [x] 2. Implement SupabaseClient utility in Spring Boot
  - [x] 2.1 Create `SupabaseClient` component
    - Implement GET, POST, PATCH, DELETE methods wrapping HttpClient calls to the Supabase PostgREST API
    - Read `supabase.url` and `supabase.key` from application.properties
    - Set `apikey` and `Authorization` headers on all requests
    - Throw `SupabaseConnectionException` on connection failures
    - _Requirements: 6.1, 6.3, 3.7, 3.8_
  - [x] 2.2 Write unit tests for SupabaseClient
    - Test header construction, URL building, error handling for connection failures
    - _Requirements: 3.7, 3.8, 6.3_

- [x] 3. Implement ProductService with Supabase
  - [x] 3.1 Update Product model to include all fields (id as UUID string, specs as Map, tags as List, brand, stock, rating)
    - _Requirements: 1.1_
  - [x] 3.2 Rewrite ProductService to use SupabaseClient
    - Implement `getAllProducts()` and `getProductById(String id)` querying the products table
    - Return HTTP 503 on Supabase connection failure
    - _Requirements: 3.1, 3.2, 3.7_
  - [x] 3.3 Write property test for product persistence round-trip
    - **Property 1: Product persistence round-trip**
    - **Validates: Requirements 1.1, 3.1, 3.2**

- [x] 4. Implement CartService with Supabase
  - [x] 4.1 Rewrite CartService to use SupabaseClient
    - Implement getCart, addToCart, removeFromCart, clearCart, updateQuantity, addBatchToCart using cart_items table
    - Use session_id filtering and unique constraint on (session_id, product_id)
    - Return HTTP 503 on Supabase connection failure
    - _Requirements: 3.3, 3.4, 3.8_
  - [ ]* 4.2 Write property test for cart persistence round-trip
    - **Property 2: Cart persistence round-trip**
    - **Validates: Requirements 1.2, 3.3, 3.4**

- [x] 5. Implement ChatHistoryService with Supabase
  - [x] 5.1 Rewrite ChatHistoryService to use SupabaseClient
    - Implement getHistory (ordered by created_at ASC), addMessage, clearHistory using chat_history table
    - _Requirements: 3.5, 3.6_
  - [ ]* 5.2 Write property test for chat history persistence with ordering
    - **Property 3: Chat history persistence with ordering**
    - **Validates: Requirements 1.3, 3.5, 3.6**

- [x] 6. Checkpoint - Core services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement PromotionService and bundle endpoints
  - [x] 7.1 Create Promotion, Bundle, and BundleItem model classes
    - _Requirements: 7.1, 7.3_
  - [x] 7.2 Create PromotionService with SupabaseClient
    - Implement getAllPromotions, getPromotionsForProduct (join via product_promotions), getAllBundles (with bundle_items), getActiveBundles (filter is_active=true)
    - _Requirements: 7.6_
  - [x] 7.3 Create PromotionController and BundleController REST endpoints
    - GET /api/promotions, GET /api/promotions/product/{productId}, GET /api/bundles, GET /api/bundles/active
    - _Requirements: 7.6_
  - [x] 7.4 Write property test for promotion/bundle persistence round-trip
    - **Property 9: Promotion and bundle persistence round-trip**
    - **Validates: Requirements 7.1, 7.3**
  - [x] 7.5 Write property test for promotion-product relationship integrity
    - **Property 10: Promotion-product and bundle-product relationship integrity**
    - **Validates: Requirements 7.2, 7.4**
  - [ ]* 7.6 Write property test for active bundle filtering
    - **Property 11: Active bundle filtering**
    - **Validates: Requirements 7.6**

- [x] 8. Implement discount calculation utility
  - [x] 8.1 Create a discount calculation utility function
    - Calculate discounted price: price × (1 - value/100) for percentage, price - value for fixed_amount
    - Ensure result is never negative (floor at 0)
    - This utility will be used by both backend (for API responses) and frontend (for display)
    - _Requirements: 7.7_
  - [ ]* 8.2 Write property test for discount price calculation
    - **Property 12: Discount price calculation**
    - **Validates: Requirements 7.7**

- [x] 9. Checkpoint - Backend services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Build the migration script
  - [x] 10.1 Create `scripts/seed-products.mjs` with CSV parsing and product import
    - Read and parse the commercetools CSV with `=""value""` encoding handling
    - Filter for mobile products by productType.key and categories
    - Deduplicate by product key (first variant only)
    - Map columns to Product_Table schema (name, price in pounds, description, image_url, brand, specs JSONB, tags, stock, rating)
    - Insert into Supabase products table via REST API
    - Report imported/skipped counts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_
  - [x] 10.2 Add promotions and bundles seeding to the migration script
    - After product import, seed sample promotions (e.g., "Summer Sale 15% Off", "New Customer £20 Off", "Flash Deal 10% Off Samsung")
    - Create product_promotions links assigning promotions to relevant products
    - Seed sample bundles (e.g., "Budget Phone Bundle", "Flagship Duo Pack")
    - Create bundle_items links with 2-3 products per bundle
    - _Requirements: 7.5_
  - [ ]* 10.3 Write property test for CSV value parsing round-trip
    - **Property 4: Commercetools CSV value parsing**
    - **Validates: Requirements 2.1**
  - [ ]* 10.4 Write property test for CSV row to product mapping
    - **Property 5: CSV row to product mapping with spec extraction**
    - **Validates: Requirements 2.3, 2.4**
  - [ ]* 10.5 Write property test for mobile product filtering
    - **Property 6: Mobile product filtering**
    - **Validates: Requirements 2.2**
  - [ ]* 10.6 Write property test for variant deduplication
    - **Property 7: Variant deduplication**
    - **Validates: Requirements 2.5**

- [x] 11. Update frontend to consume Supabase-sourced data
  - [x] 11.1 Remove hardcoded product data from `src/lib/products.ts`
    - Remove the `products` array and `deals` array
    - Keep the `Product` interface export
    - Add `Promotion` and `Bundle` TypeScript interfaces
    - _Requirements: 4.4_
  - [x] 11.2 Update `src/app/api/chat/route.ts` to fetch products from backend API
    - Replace static import with runtime fetch from Spring Boot API
    - Include promotion/bundle data in AI assistant context
    - Handle API errors gracefully
    - _Requirements: 4.1, 5.1, 5.2, 7.8_
  - [x] 11.3 Update product cards and detail pages to display promotions and bundles
    - Fetch promotions for each product from `/api/promotions/product/{id}`
    - Fetch active bundles from `/api/bundles/active`
    - Display promotional labels, calculated discounted prices, and bundle deals
    - _Requirements: 4.2, 4.3, 7.7_

- [x] 12. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The commercetools CSV has no discount/voucher data for phones — all promotions and bundles are self-generated sample data
- The Spring Boot backend uses Supabase PostgREST API (HTTP/JSON), not JDBC/JPA
- Property tests use jqwik (Java) and fast-check (Node.js)
- Each task references specific requirements for traceability
