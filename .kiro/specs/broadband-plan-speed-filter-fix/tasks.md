# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** — Broadband Plan Display Truncation and Speed Parsing Defects
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the five defects exist
  - **Scoped PBT Approach**: Use fast-check to generate arrays of 1–20 BroadbandPlan objects and user text strings with embedded Mbps numbers
  - Create test file `src/lib/__tests__/broadband-speed-filter-bug.test.ts`
  - **Sub-property 1a — No Truncation**: For any array of N filtered plans (N > 0), assert that summary card count equals N (not capped at 3). Generate arrays of 1–20 plans via `fc.array(arbBroadbandPlan, {minLength: 1, maxLength: 20})` and verify `summaryCards.length === filtered.length`. On unfixed code, any array with length > 3 will produce a counterexample where `summaryCards.length === 3`.
  - **Sub-property 1b — Explicit Speed Parsed**: For any string containing `N Mbps` (N ∈ [1, 2000]), assert `parsePreferences(text).minSpeed === N`. Generate via `fc.integer({min:1, max:2000})` combined with text templates. On unfixed code, `minSpeed` will be `undefined` for all inputs.
  - **Sub-property 1c — Zero-Match Feedback**: When `filterPlans` returns 0 plans but `plans.length > 0` and a speed preference was set, assert the response message mentions the requested speed and the fastest available speed. On unfixed code, the message is generic "broaden your criteria".
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., "6 plans filtered but only 3 summary cards", "parsePreferences('100 Mbps').minSpeed is undefined")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Keyword Speed Tiers, Budget, Contract, and Show-All Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file `src/lib/__tests__/broadband-speed-filter-preservation.test.ts`
  - **Observe on UNFIXED code first**, then write property-based tests capturing observed behavior:
  - **Sub-property 2a — Keyword Speed Tier Preservation**: For any input using only keyword speed terms ("fast", "gaming", "streaming", "standard", "basic", "light", "high speed") without explicit numeric Mbps, assert `parsePreferences(text).speedTier` matches the original mapping: "fast"/"gaming"/"streaming"/"high speed" → `'fast'`, "standard"/"basic"/"light" → `'standard'`. Use `fc.constantFrom(...)` to pick keywords and `fc.string()` for surrounding text. Verify `minSpeed` is `null`/`undefined`.
  - **Sub-property 2b — Budget Filter Preservation**: For any input with budget keywords ("budget", "cheap", "affordable", "low cost") or explicit amounts ("under £N"), assert `parsePreferences` returns the same `maxBudget` value. Generate budget amounts via `fc.integer({min:10, max:200})`. Then for any plan array, assert `filterPlans(plans, filter)` returns only plans with `monthlyPrice <= maxBudget`, sorted by price ascending.
  - **Sub-property 2c — Contract Filter Preservation**: For any input with contract keywords ("short contract", "no contract", "flexible") or explicit months ("N month"), assert `parsePreferences` returns the same `maxContractMonths`. Generate months via `fc.integer({min:1, max:36})`. Then assert `filterPlans` returns only plans with `contractLengthMonths <= maxContractMonths`.
  - **Sub-property 2d — Show All Preservation**: For any input matching "show all plans", "show all available", or "show all", assert `parsePreferences` returns `showAll: true` and `filterPlans` returns the full plan array unchanged.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_


- [x] 3. Fix for broadband plan speed filter defects

  - [x] 3.1 Remove `slice(0, 3)` truncation in `handlePreferencesStep`
    - In `src/components/AiChatPanel.tsx`, change `filtered.slice(0, 3).map(p => ({...}))` to `filtered.map(p => ({...}))` at the `summaryCards` construction (~line 347)
    - This ensures all filtered plans are rendered as summary cards
    - _Bug_Condition: isBugCondition(input) where input.action = 'renderSummaryCards' AND length(input.plans) > 3_
    - _Expected_Behavior: summaryCards.length === filteredPlans.length for any number of filtered plans_
    - _Preservation: Plans with ≤3 results continue to render identically_
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Remove `slice(0, 3)` truncation in `sendMessage` API response handler
    - In `src/components/AiChatPanel.tsx`, change `data.summaryCards.slice(0, 3)` to `data.summaryCards` in the `setMessages` call (~line 1000)
    - This ensures API-returned summary cards are not truncated
    - _Bug_Condition: isBugCondition(input) where input.action = 'renderSummaryCards' in sendMessage handler_
    - _Expected_Behavior: All API-returned summary cards are preserved_
    - _Requirements: 1.1, 2.1_

  - [x] 3.3 Remove `slice(0, 3)` truncation in JSX rendering
    - In `src/components/AiChatPanel.tsx`, change `msg.summaryCards.slice(0, 3).map(card => ...)` to `msg.summaryCards.map(card => ...)` in the JSX (~line 1080)
    - This ensures the rendering layer does not re-truncate cards
    - _Bug_Condition: isBugCondition(input) where input.action = 'renderSummaryCards' in JSX_
    - _Expected_Behavior: All summary cards in message state are rendered in the DOM_
    - _Requirements: 1.1, 2.1_

  - [x] 3.4 Add `minSpeed` field to `PreferenceFilter` interface and add explicit speed regex to `parsePreferences`
    - Add `minSpeed: number | null` to the `PreferenceFilter` interface in `src/components/AiChatPanel.tsx`
    - Initialize `minSpeed: null` in the filter object inside `parsePreferences`
    - Add regex `/(\d+)\s*(?:mbps|mb)/i` after the keyword speed tier checks to extract numeric speed
    - Set `filter.minSpeed` to the parsed integer value when matched
    - _Bug_Condition: isBugCondition(input) where input.action = 'parsePreferences' AND input.userText MATCHES /(\d+)\s*(?:mbps|mb)/i_
    - _Expected_Behavior: parsePreferences(text).minSpeed === N for any text containing "N Mbps"_
    - _Preservation: Keyword-only inputs continue to produce speedTier values with minSpeed = null_
    - _Requirements: 1.2, 2.2, 3.1_

  - [x] 3.5 Add `minSpeed` filtering to `filterPlans`
    - After the `speedTier` filter block in `filterPlans`, add: if `filter.minSpeed !== null`, filter plans where `p.downloadSpeedMbps >= filter.minSpeed`
    - _Bug_Condition: isBugCondition(input) where minSpeed is set but not used for filtering_
    - _Expected_Behavior: filterPlans returns only plans with downloadSpeedMbps >= minSpeed_
    - _Preservation: When minSpeed is null, filterPlans behavior is identical to original_
    - _Requirements: 2.2_

  - [x] 3.6 Add speed-aware zero-match feedback in `handlePreferencesStep`
    - When `filtered.length === 0` and `plans.length > 0`, check if the preference had a speed constraint (`preferences.speedTier !== null || preferences.minSpeed !== null`)
    - If speed constraint present, compute fastest available speed via `Math.max(...plans.map(p => p.downloadSpeedMbps))`
    - Build message: "No plans matching [requested speed] are available at your address. The fastest available speed is [max] Mbps. Here are the [N] available plans:"
    - Fall back to showing all plans with summary cards when speed mismatch detected
    - _Bug_Condition: isBugCondition(input) where filterPlans returns 0 AND plans.length > 0 AND speed preference set_
    - _Expected_Behavior: Response message mentions requested speed, fastest available speed, and offers all plans_
    - _Preservation: Non-speed zero-match (budget/contract only) continues to show generic "broaden criteria" message_
    - _Requirements: 1.3, 2.3_

  - [x] 3.7 Add speed complaint detection in `processGuidedFlowMessage` at plan step
    - Before the catch-all "Please click Select Plan" response in the `plan` step handler
    - Add pattern matching for speed complaints: `/(?:don'?t see|where|why|no|missing|can'?t find).*(?:\d+\s*mbps|fast|speed|100|500|900)/i` and similar
    - When matched, respond with acknowledgment of the mismatch, explain that available speeds depend on the technology infrastructure at their address, and offer "Show all plans" or "Try a different address"
    - _Bug_Condition: isBugCondition(input) where input.action = 'processGuidedFlowMessage' AND input.currentStep = 'plan' AND input.userText matches speed complaint_
    - _Expected_Behavior: Response acknowledges complaint, explains technology limitations, offers alternatives_
    - _Preservation: Non-complaint messages at plan step continue to get "Please click Select Plan"_
    - _Requirements: 1.4, 2.4_

  - [x] 3.8 Update `seed-broadband.sql` to enable FTTP for one Swansea address
    - In `scripts/seed-broadband.sql`, update the first Swansea address (UPRN `A15099951235`, "BT Test Facility") to set `technology_fttp=true`
    - All other Swansea addresses remain unchanged
    - _Bug_Condition: isBugCondition(input) where input.address.postcode = 'SA1 6AU' AND technology_fttp = false FOR ALL addresses_
    - _Expected_Behavior: At least one SA1 6AU address has technology_fttp=true, enabling FTTP plan testing_
    - _Preservation: London (SW1A 1AA) and Manchester (M1 1AE) seed data unchanged_
    - _Requirements: 1.5, 2.5, 3.6_

  - [x] 3.9 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — All Filtered Plans Rendered and Explicit Speeds Parsed
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.10 Verify preservation tests still pass
    - **Property 2: Preservation** — Keyword Speed Tiers, Budget, Contract, and Show-All Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite to verify no regressions
  - Ensure both bug condition exploration tests and preservation property tests pass
  - Ensure existing project tests are not broken
  - Ask the user if questions arise
