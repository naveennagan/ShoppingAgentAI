# Requirements Document

## Introduction

The Broadband Checker is a new feature for the AI.Shop shopping agent that allows users to check broadband availability at their address, view available plans, and receive AI-powered recommendations to help them choose the best broadband option. The feature integrates with EE/BT telecom APIs (api.ee.co.uk) for address lookup, technical eligibility checking, and product offering qualification. The existing Gemini AI integration is extended to provide personalised broadband recommendations based on the user's needs and the plans available at their address.

## Glossary

- **Broadband_Checker**: The UI component and associated backend services that orchestrate the broadband availability and recommendation flow.
- **Address_Lookup_Service**: The backend service that calls the EE Geographic Address Management API to resolve postcodes into structured addresses.
- **Eligibility_Service**: The backend service that calls the EE Technical Eligibility API to determine which broadband technologies are available at a given address.
- **Product_Qualification_Service**: The backend service that calls the EE Product Offering Qualification API to retrieve available broadband products and pricing for an address.
- **Broadband_AI_Advisor**: The Gemini-powered AI component that analyses available broadband plans and user preferences to produce ranked recommendations.
- **EE_API**: The external EE/BT telecom API suite hosted at api.ee.co.uk.
- **Postcode**: A UK Royal Mail postcode used to identify a geographic area for address lookup.
- **UPRN**: Unique Property Reference Number — the identifier returned by the EE Geographic Address Management API that uniquely identifies a UK address.
- **Broadband_Plan**: A broadband product offering returned by the EE Product Offering Qualification API, including speed, technology type, contract length, and monthly price.
- **Session**: A browser session identified by a session ID stored in localStorage, consistent with the existing cart and chat session model.

---

## Requirements

### Requirement 1: Postcode and Address Entry

**User Story:** As a user, I want to enter my postcode and select my address, so that the system can check which broadband plans are available at my property.

#### Acceptance Criteria

1. THE Broadband_Checker SHALL display a postcode input field and a "Find Address" button.
2. WHEN the user submits a postcode containing fewer than 5 characters or more than 8 characters, THE Broadband_Checker SHALL display a validation error message without calling the EE_API.
3. WHEN the user submits a valid postcode, THE Address_Lookup_Service SHALL call the EE Geographic Address Management API (`GET https://api.ee.co.uk/common/geographicAddressManagement/v1/geographicAddress`) with the postcode as a query parameter.
4. WHEN the EE Geographic Address Management API returns one or more addresses, THE Broadband_Checker SHALL display a dropdown list of those addresses for the user to select from.
5. IF the EE Geographic Address Management API returns zero addresses for a postcode, THEN THE Broadband_Checker SHALL display a message informing the user that no addresses were found for that postcode.
6. IF the EE Geographic Address Management API returns an error response, THEN THE Broadband_Checker SHALL display a user-friendly error message and allow the user to retry.

---

### Requirement 2: Broadband Availability Check

**User Story:** As a user, I want the system to check broadband availability at my selected address, so that I can see which technologies and plans are accessible to me.

#### Acceptance Criteria

1. WHEN the user selects an address from the dropdown, THE Eligibility_Service SHALL call the EE Technical Eligibility API (`POST /v1/services-technical-eligibility`) with the selected address UPRN.
2. WHEN the EE Technical Eligibility API returns eligible services, THE Product_Qualification_Service SHALL call the EE Product Offering Qualification API (`POST /bt-consumer/tmf/productOfferingQualification/v4/productOfferingQualification`) with the address UPRN to retrieve available broadband products.
3. WHEN both eligibility and product qualification calls succeed, THE Broadband_Checker SHALL display the list of available Broadband_Plans to the user, including plan name, download speed, upload speed, contract length, and monthly price.
4. IF the EE Technical Eligibility API indicates no eligible services at the address, THEN THE Broadband_Checker SHALL display a message informing the user that broadband is not available at their address.
5. IF either the eligibility or product qualification API call fails, THEN THE Broadband_Checker SHALL display a user-friendly error message and log the error details server-side.
6. WHILE an availability check is in progress, THE Broadband_Checker SHALL display a loading indicator to the user.

---

### Requirement 3: Broadband Plan Display

**User Story:** As a user, I want to see the available broadband plans clearly presented, so that I can compare options before asking for a recommendation.

#### Acceptance Criteria

1. THE Broadband_Checker SHALL display each Broadband_Plan as a card showing: plan name, download speed (Mbps), upload speed (Mbps), technology type (e.g. FTTP, FTTC, SOGEA), contract length (months), and monthly price (£).
2. THE Broadband_Checker SHALL sort the displayed Broadband_Plans by monthly price in ascending order by default.
3. WHERE a Broadband_Plan includes a promotional offer, THE Broadband_Checker SHALL display the promotional label alongside the plan card.
4. THE Broadband_Checker SHALL display the total count of available plans above the plan list.

---

### Requirement 4: AI-Powered Broadband Recommendation

**User Story:** As a user, I want AI-powered recommendations based on my needs and the available plans, so that I can make an informed decision without having to compare every plan manually.

#### Acceptance Criteria

1. WHEN available Broadband_Plans are displayed, THE Broadband_Checker SHALL present a prompt asking the user to describe their broadband usage needs (e.g. number of users, streaming, gaming, working from home).
2. WHEN the user submits their usage description, THE Broadband_AI_Advisor SHALL send the list of available Broadband_Plans and the user's usage description to the Gemini AI API and request a ranked recommendation with reasoning.
3. WHEN the Broadband_AI_Advisor receives a response from Gemini, THE Broadband_Checker SHALL display the top recommended plan prominently, along with a plain-language explanation of why it was recommended.
4. WHEN the Broadband_AI_Advisor receives a response from Gemini, THE Broadband_Checker SHALL display up to two alternative plan recommendations with brief reasoning.
5. IF the Gemini API returns an error or rate-limit response, THEN THE Broadband_AI_Advisor SHALL return a fallback message informing the user that AI recommendations are temporarily unavailable, and THE Broadband_Checker SHALL still display the full plan list.
6. THE Broadband_AI_Advisor SHALL respond within 10 seconds of receiving the user's usage description; IF the response exceeds 10 seconds, THEN THE Broadband_Checker SHALL display a timeout message and allow the user to retry.

---

### Requirement 5: Backend Proxy for EE API Calls

**User Story:** As a developer, I want all EE API calls to be proxied through the Spring Boot backend, so that API credentials are never exposed to the browser and requests can be monitored and rate-limited.

#### Acceptance Criteria

1. THE Address_Lookup_Service SHALL expose a REST endpoint (`GET /api/broadband/addresses`) that accepts a postcode query parameter and proxies the request to the EE Geographic Address Management API.
2. THE Eligibility_Service SHALL expose a REST endpoint (`POST /api/broadband/eligibility`) that accepts an address UPRN and proxies the request to the EE Technical Eligibility API.
3. THE Product_Qualification_Service SHALL expose a REST endpoint (`POST /api/broadband/products`) that accepts an address UPRN and proxies the request to the EE Product Offering Qualification API.
4. THE Address_Lookup_Service SHALL read EE API credentials from application configuration properties and SHALL NOT include credentials in any response returned to the frontend.
5. IF the EE_API returns an HTTP 4xx or 5xx response, THEN THE Address_Lookup_Service SHALL return an appropriate HTTP error status to the frontend with a structured error body containing a human-readable message.
6. THE Broadband_Checker backend endpoints SHALL be covered by the existing CORS configuration allowing requests from `http://localhost:3000`.

---

### Requirement 6: Frontend API Client Integration

**User Story:** As a developer, I want the broadband checker frontend to use the existing API client pattern, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE Broadband_Checker SHALL call backend broadband endpoints exclusively through methods added to the existing `apiClient` object in `src/lib/api-client.ts`.
2. THE Broadband_Checker SHALL handle API errors thrown by the `apiClient` methods and display appropriate error states in the UI without crashing.
3. THE Broadband_Checker SHALL be accessible via a dedicated route (`/broadband`) within the existing Next.js app router structure.

---

### Requirement 7: Navigation and Entry Points

**User Story:** As a user, I want to easily find and access the broadband checker from the main navigation, so that I can use it without searching for it.

#### Acceptance Criteria

1. THE Broadband_Checker SHALL be accessible from a "Broadband" link added to the existing `Navbar` component.
2. WHEN the user navigates to `/broadband`, THE Broadband_Checker SHALL render the postcode entry form in its initial state, with no pre-populated address or plan data.
3. THE Broadband_AI_Advisor SHALL be accessible from within the Broadband_Checker page without requiring the user to open the existing AI chat panel.

---

### Requirement 8: EE API Response Parsing and Serialisation

**User Story:** As a developer, I want the backend to correctly parse and serialise EE API responses, so that data is reliably transformed between the EE API format and the frontend's expected format.

#### Acceptance Criteria

1. WHEN the EE Geographic Address Management API returns an address list, THE Address_Lookup_Service SHALL parse each address entry into a structured `BroadbandAddress` object containing at minimum: UPRN, formatted address line, town, and postcode.
2. WHEN the EE Product Offering Qualification API returns a product list, THE Product_Qualification_Service SHALL parse each product into a `BroadbandPlan` object containing: plan ID, name, download speed, upload speed, technology type, contract length, and monthly price.
3. THE Address_Lookup_Service SHALL serialise `BroadbandAddress` objects to JSON when returning responses to the frontend.
4. THE Product_Qualification_Service SHALL serialise `BroadbandPlan` objects to JSON when returning responses to the frontend.
5. FOR ALL valid `BroadbandPlan` objects returned by the EE API, parsing the API response then serialising to JSON then parsing again SHALL produce an equivalent `BroadbandPlan` object (round-trip property).
6. IF the EE API response contains fields that do not map to known `BroadbandPlan` or `BroadbandAddress` fields, THEN THE Address_Lookup_Service and THE Product_Qualification_Service SHALL ignore unknown fields without throwing an error.
