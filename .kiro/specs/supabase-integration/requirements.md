# Requirements Document

## Introduction

This feature replaces the hardcoded product data and in-memory storage (ConcurrentHashMap) in the AI Shopping Assistant with Supabase as a persistent database backend. The initial dataset focuses on ~100 mobile products imported from a commercetools CSV product export. The integration spans both the Next.js frontend and the Spring Boot backend, ensuring the AI chat assistant works with database-sourced product data.

## Glossary

- **Supabase**: A hosted PostgreSQL database platform providing REST APIs and real-time capabilities
- **Product_Table**: The Supabase database table storing product information
- **Cart_Table**: The Supabase database table storing shopping cart items associated with a session
- **Chat_History_Table**: The Supabase database table storing chat conversation messages associated with a session
- **Product_Service**: The Spring Boot service responsible for querying and returning product data from Supabase
- **Cart_Service**: The Spring Boot service responsible for managing cart operations against Supabase
- **Chat_History_Service**: The Spring Boot service responsible for managing chat history persistence in Supabase
- **Migration_Script**: A script that reads the commercetools CSV product export, maps relevant columns to the Product_Table schema, and inserts records into Supabase
- **Frontend_Client**: The Next.js application that consumes product data via the Spring Boot API
- **AI_Assistant**: The Gemini-powered chat assistant that uses product data to help users shop
- **Commercetools_CSV**: The source CSV file (Products_Export_16-02-26_20-40.csv), a commercetools product export with ~337 columns per row, containing products across multiple categories (mobiles, TVs, wearables, etc.) with multiple variant rows per product
- **Promotions_Table**: The Supabase database table storing promotional offers with discount details, promo codes, and validity periods
- **Product_Promotions_Table**: A junction table linking products to promotions (many-to-many relationship)
- **Bundles_Table**: The Supabase database table storing bundle deals that group multiple products together at a discount
- **Bundle_Items_Table**: A junction table linking bundles to their constituent products
- **Promotion_Service**: The Spring Boot service responsible for querying promotions and bundles from Supabase

## Requirements

### Requirement 1: Supabase Database Schema Setup

**User Story:** As a developer, I want a well-structured Supabase database schema, so that product, cart, and chat history data is stored persistently with proper constraints and relationships.

#### Acceptance Criteria

1. THE Product_Table SHALL store products with columns for id (UUID primary key), name (text, not null), price (numeric, not null), description (text), category (text, not null), image_url (text), specs (JSONB), brand (text), stock (integer, default 0), rating (numeric), and tags (text array)
2. THE Cart_Table SHALL store cart items with columns for id (UUID primary key), session_id (text, not null), product_id (UUID, foreign key to Product_Table), quantity (integer, not null, default 1), and created_at (timestamp with time zone, default now)
3. THE Chat_History_Table SHALL store messages with columns for id (UUID primary key), session_id (text, not null), role (text, not null), message_text (text, not null), and created_at (timestamp with time zone, default now)
4. THE Product_Table SHALL enforce a unique constraint on the name column to prevent duplicate product entries
5. THE Cart_Table SHALL enforce a foreign key constraint from product_id to Product_Table id, with cascade delete behavior
6. THE Product_Table SHALL have an index on the category column to support efficient category-based filtering

### Requirement 2: Mobile Product Data Import from Commercetools CSV

**User Story:** As a developer, I want to import ~100 mobile products from the commercetools CSV export into Supabase, so that the application has a realistic dataset of mobile phones to showcase.

#### Acceptance Criteria

1. THE Migration_Script SHALL read the Commercetools_CSV file and parse product records, handling the commercetools export format where values are wrapped in `=""value""` encoding
2. THE Migration_Script SHALL filter products to include only mobile phone products, using the productType.key column (e.g., "tradein-producttype") and the categories column to identify mobile-related entries
3. THE Migration_Script SHALL map the following commercetools CSV columns to the Product_Table schema: name.en-GB to name, description.en-GB to description, the price columns (centAmount in GBP centPrecision) to price (converted from pence to pounds), image URLs to image_url, and brand attribute to brand
4. THE Migration_Script SHALL extract mobile-specific specs from the structured attributes text (e.g., RAM, storage, screen size, camera, processor, battery, OS, colour) and store them as a JSONB object in the specs column
5. WHEN the CSV contains multiple variant rows for the same product (same product key), THE Migration_Script SHALL import only one representative variant per product to avoid duplicates
6. WHEN a product record has missing required fields (name or price), THE Migration_Script SHALL skip that record and log a warning
7. THE Migration_Script SHALL generate a UUID for each imported product
8. WHEN the Migration_Script completes, THE Migration_Script SHALL report the total number of successfully imported products and the number of skipped records
9. THE Migration_Script SHALL set the category field to "Mobile" for all imported mobile products and generate appropriate tags from the product attributes (e.g., brand name, OS, connectivity features)

### Requirement 3: Spring Boot Backend Supabase Integration

**User Story:** As a developer, I want the Spring Boot backend to read and write data from Supabase instead of in-memory storage, so that data persists across server restarts.

#### Acceptance Criteria

1. THE Product_Service SHALL query the Product_Table in Supabase to retrieve all products
2. THE Product_Service SHALL query the Product_Table in Supabase to retrieve a single product by its id
3. THE Cart_Service SHALL persist cart items to the Cart_Table in Supabase when items are added, updated, or removed
4. THE Cart_Service SHALL retrieve cart items from the Cart_Table filtered by session_id
5. THE Chat_History_Service SHALL persist chat messages to the Chat_History_Table in Supabase
6. THE Chat_History_Service SHALL retrieve chat history from the Chat_History_Table filtered by session_id, ordered by created_at ascending
7. WHEN the Supabase connection fails, THE Product_Service SHALL return an appropriate error response with HTTP status 503
8. WHEN the Supabase connection fails, THE Cart_Service SHALL return an appropriate error response with HTTP status 503

### Requirement 4: Frontend Product Data Consumption

**User Story:** As a developer, I want the Next.js frontend to display products sourced from Supabase (via the backend API), so that the product catalog reflects the database contents.

#### Acceptance Criteria

1. THE Frontend_Client SHALL fetch products from the Spring Boot API endpoint, which returns Supabase-sourced data
2. THE Frontend_Client SHALL render product listings using the same Product interface (id, name, price, description, category, image, specs, brand, stock, rating, tags)
3. WHEN the backend API returns an error, THE Frontend_Client SHALL display a user-friendly error message instead of crashing
4. THE Frontend_Client SHALL remove the hardcoded product array from src/lib/products.ts and rely solely on API-fetched data

### Requirement 5: AI Assistant Integration with Database Products

**User Story:** As a user, I want the AI shopping assistant to know about all products in the database, so that it can help me find and compare mobile phones accurately.

#### Acceptance Criteria

1. THE AI_Assistant SHALL receive product data fetched from the backend API (Supabase-sourced) when constructing the system prompt
2. WHEN the product catalog changes in Supabase, THE AI_Assistant SHALL reflect the updated catalog in subsequent chat sessions without requiring a code deployment
3. THE AI_Assistant SHALL include product specs (RAM, storage, camera, processor) in its knowledge base so it can answer comparison questions about mobile phones

### Requirement 6: Configuration and Environment Setup

**User Story:** As a developer, I want Supabase connection details managed through environment variables, so that credentials are not hardcoded and different environments can be configured independently.

#### Acceptance Criteria

1. THE Spring Boot backend SHALL read Supabase connection details (URL, API key, or JDBC connection string) from application.properties or environment variables
2. THE .env.example files SHALL be updated to include placeholder entries for all Supabase-related environment variables
3. WHEN Supabase environment variables are missing, THE Spring Boot backend SHALL fail to start with a clear error message indicating which variables are required


### Requirement 7: Promotions, Discounts, and Bundles Database Support

**User Story:** As a user, I want to see promotional offers, discounted prices, and bundle deals on products, so that I can find the best deals and save money when shopping for mobile phones.

#### Acceptance Criteria

1. THE Promotions_Table SHALL store promotions with columns for id (UUID primary key), name (text, not null), description (text), discount_type (text, not null, constrained to 'percentage' or 'fixed_amount'), discount_value (numeric, not null), promo_code (text, unique, nullable), start_date (timestamptz), end_date (timestamptz), promotional_label (text), is_active (boolean, default true), and created_at (timestamptz, default now)
2. THE Product_Promotions_Table SHALL store product-promotion associations with columns for id (UUID primary key), product_id (UUID, foreign key to Product_Table, not null), promotion_id (UUID, foreign key to Promotions_Table, not null), and created_at (timestamptz, default now), with a unique constraint on the combination of product_id and promotion_id
3. THE Bundles_Table SHALL store bundle deals with columns for id (UUID primary key), name (text, not null), description (text), discount_type (text, not null), discount_value (numeric, not null), is_active (boolean, default true), and created_at (timestamptz, default now)
4. THE Bundle_Items_Table SHALL store bundle-product associations with columns for id (UUID primary key), bundle_id (UUID, foreign key to Bundles_Table, not null), product_id (UUID, foreign key to Product_Table, not null), and created_at (timestamptz, default now)
5. THE Migration_Script SHALL seed sample promotions (e.g., seasonal sales, brand-specific discounts, promo code offers) and bundle deals for the imported mobile products, since the Commercetools_CSV does not contain discount or voucher data for phone products
6. THE Promotion_Service SHALL provide API endpoints to retrieve all promotions, retrieve promotions for a specific product by product_id, retrieve all bundles, and retrieve only active bundles
7. THE Frontend_Client SHALL display promotional labels, calculated discounted prices, and available bundle deals on product cards and product detail pages
8. THE AI_Assistant SHALL have knowledge of active promotions and bundles so that the AI_Assistant can recommend deals and answer questions about current offers
