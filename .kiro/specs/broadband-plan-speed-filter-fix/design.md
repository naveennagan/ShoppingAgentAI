# Broadband Plan Speed Filter Fix — Bugfix Design

## Overview

The broadband chat experience has five interrelated defects that prevent users from seeing and requesting plans at their desired speed. The primary bug is a hard-coded `slice(0, 3)` that truncates summary cards, hiding higher-speed plans that the backend correctly returns. Secondary bugs include missing explicit speed parsing (e.g. "100 Mbps"), silent fallback when no plans match a speed preference, dismissive AI responses to speed complaints, and insufficient Swansea seed data for full-speed-range testing. The fix strategy is to remove the truncation, extend `parsePreferences` with a `minSpeed` field, add user-facing feedback for zero-match scenarios, detect speed complaints in the plan step, and update one Swansea address to enable FTTP.

## Glossary

- **Bug_Condition (C)**: The set of conditions across five defects that cause incorrect plan display, missing speed parsing, silent fallback, dismissive responses, or limited test coverage
- **Property (P)**: The desired behavior — all filtered plans rendered, explicit speeds parsed, zero-match feedback given, complaints acknowledged, and Swansea FTTP enabled
- **Preservation**: Existing keyword-based speed tier filtering, budget/contract filtering, "show all" behavior, mouse-click plan selection, guided flow step transitions, and London/Manchester seed data must remain unchanged
- **parsePreferences**: Function in `AiChatPanel.tsx` that converts user text into a `PreferenceFilter` object
- **filterPlans**: Function in `AiChatPanel.tsx` that filters `BroadbandPlan[]` by `PreferenceFilter` criteria
- **handlePreferencesStep**: Async callback in `AiChatPanel.tsx` that fetches plans, applies `filterPlans`, and renders summary cards
- **processGuidedFlowMessage**: Async callback in `AiChatPanel.tsx` that routes user messages to the correct guided flow step handler
- **PreferenceFilter**: Interface with `speedTier`, `maxBudget`, `maxContractMonths`, `usageType`, `showAll` fields — to be extended with `minSpeed`

## Bug Details

### Bug Condition

The bug manifests across five scenarios: (1) summary card rendering truncates to 3 cards via `filtered.slice(0, 3)`, hiding plans sorted beyond index 2; (2) `parsePreferences` ignores explicit numeric speed requests; (3) `handlePreferencesStep` silently falls back to lower-speed plans when speed filtering yields zero results but other plans exist; (4) `processGuidedFlowMessage` at the `plan` step responds to speed complaints with a generic "Please click Select Plan" message; (5) all Swansea seed addresses have `technology_fttp=false`, preventing FTTP plan testing at SA1 6AU.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { action, plans, userText, address }
  OUTPUT: boolean

  // Defect 1: Truncation
  IF input.action = 'renderSummaryCards' AND length(input.plans) > 3
    RETURN true
  END IF

  // Defect 2: Explicit speed not parsed
  IF input.action = 'parsePreferences' AND input.userText MATCHES /(\d+)\s*(?:mbps|mb)/i
    RETURN true  // current code ignores this
  END IF

  // Defect 3: Silent zero-match fallback
  IF input.action = 'handlePreferences'
     AND filterPlans(input.plans, input.preferences).length = 0
     AND input.plans.length > 0
     AND input.preferences.speedTier IS NOT NULL OR input.preferences.minSpeed IS NOT NULL
    RETURN true  // no feedback given about speed unavailability
  END IF

  // Defect 4: Complaint dismissed
  IF input.action = 'processGuidedFlowMessage'
     AND input.currentStep = 'plan'
     AND input.userText MATCHES speed complaint pattern
    RETURN true  // responds with generic "click Select Plan"
  END IF

  // Defect 5: Swansea FTTP missing
  IF input.action = 'seedData'
     AND input.address.postcode = 'SA1 6AU'
     AND input.address.technology_fttp = false FOR ALL addresses
    RETURN true
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **Defect 1**: User at Manchester address gets 6 plans (3×SOGEA + 3×FTTC). Message says "Here are 6 broadband plans" but only 3 cheapest SOGEA cards (36 Mbps) are rendered. Expected: all 6 cards visible.
- **Defect 2**: User types "I need 100 Mbps". `parsePreferences` returns `{ speedTier: null, minSpeed: undefined, ... }` — no speed filter applied. Expected: `minSpeed: 100` extracted and used.
- **Defect 3**: User at Swansea (copper-only) asks for "fast" speeds. `filterPlans` returns 0 plans (no ≥100 Mbps). System shows generic "broaden your criteria" without mentioning speed limitation. Expected: "No plans matching 100+ Mbps available. Fastest available is 36 Mbps."
- **Defect 4**: User sees only 36 Mbps plans and types "I don't see any 100 Mbps plan here". System responds "Please click Select Plan." Expected: acknowledge the mismatch and explain technology limitations.
- **Defect 5**: Tester uses SA1 6AU postcode. All 8 addresses have `technology_fttp=false`. Only SOGEA plans returned. Expected: at least one address with `technology_fttp=true` for FTTP plan testing.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Keyword-based speed tier parsing ("fast"→≥100, "standard"→<100, "gaming", "streaming", "basic") must continue to work identically
- "Show all plans" / "show all available" must continue to return all plans without filtering
- Budget filtering via keywords ("budget", "cheap") and explicit amounts ("under £35") must remain unchanged
- Contract length filtering via keywords ("short contract") and explicit months ("12 month") must remain unchanged
- Plan selection via SummaryCard "Select Plan" button clicks must continue to work
- Guided flow step transitions (postcode → address → preferences → plan → addons → summary) must remain unchanged
- Add-on selection, summary display, and "Add to cart" flow must remain unchanged
- London (SW1A 1AA) and Manchester (M1 1AE) seed data and resulting plans must remain identical
- The backend `ProductQualificationService` plan filtering by address technology is not modified

**Scope:**
All inputs that do NOT involve the five defect conditions should be completely unaffected by this fix. This includes:
- Mouse clicks on plan cards and add-on chips
- Non-speed-related preference text (budget-only, contract-only)
- All guided flow steps other than `preferences` and `plan`
- Backend plan qualification logic
- Non-Swansea seed data addresses

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Hard-coded slice(0, 3) truncation**: In `handlePreferencesStep`, the line `filtered.slice(0, 3).map(...)` creates summary cards for only the first 3 plans. Since plans are sorted by price ascending (cheapest first), the 36 Mbps SOGEA plans always occupy the first 3 slots, pushing 100 Mbps FTTC plans out of view. There is also a second `slice(0, 3)` in the `sendMessage` function's API response handler and in the JSX rendering of `msg.summaryCards`. All three truncation points need to be removed.

2. **No regex for explicit speed numbers in parsePreferences**: The function only checks for keyword strings like "fast", "gaming", "streaming", "standard", "basic". It has no regex to extract numeric Mbps values from input like "100 Mbps" or "I need 100 mbps speed". The `PreferenceFilter` interface also lacks a `minSpeed` field to carry this value.

3. **Generic zero-match message lacks speed context**: When `filterPlans` returns an empty array, `handlePreferencesStep` shows "I couldn't find any plans matching your preferences" without mentioning what speed was requested or what the fastest available speed is. The user has no way to understand why their speed preference wasn't met.

4. **Plan step catch-all ignores complaint patterns**: In `processGuidedFlowMessage`, the `plan` step handler checks for "show all plans" and `isPlanFeatureQuery` but falls through to a generic "Please click Select Plan" for any other input. There is no detection of speed complaint patterns like "I don't see", "where are the faster", "why no 100 Mbps".

5. **Swansea seed data lacks FTTP flag**: All 8 Swansea addresses in `seed-broadband.sql` have `technology_fttp=false`. The backend `ProductQualificationService` only includes FTTP plans when `technology_fttp=true`, so Swansea addresses can never return plans above 100 Mbps (FTTC). At least one address needs `technology_fttp=true` for full speed range testing.

## Correctness Properties

Property 1: Bug Condition — All Filtered Plans Rendered as Summary Cards

_For any_ set of filtered broadband plans returned by `filterPlans`, the `handlePreferencesStep` function SHALL create one summary card per plan (no truncation), so that the number of rendered summary cards equals the number of filtered plans.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Explicit Speed Numbers Parsed into minSpeed

_For any_ user input text containing a numeric speed value followed by "Mbps" or "mb" (case-insensitive), the `parsePreferences` function SHALL extract the number and set `minSpeed` on the returned `PreferenceFilter`, and `filterPlans` SHALL use `minSpeed` to filter plans where `downloadSpeedMbps >= minSpeed`.

**Validates: Requirements 2.2**

Property 3: Bug Condition — Zero-Match Speed Feedback

_For any_ preference filter with a speed constraint (speedTier or minSpeed) that results in zero matching plans when other plans exist at the address, the `handlePreferencesStep` function SHALL inform the user that no plans match their requested speed, state the fastest available speed, and offer to show all available plans.

**Validates: Requirements 2.3**

Property 4: Bug Condition — Speed Complaint Detection and Response

_For any_ user message at the `plan` step that matches a speed complaint pattern (e.g. "I don't see any 100 Mbps", "where are the faster plans", "why no 100 Mbps"), the `processGuidedFlowMessage` function SHALL detect the complaint, acknowledge the mismatch, explain that available speeds depend on address technology, and offer to show all plans or try a different address.

**Validates: Requirements 2.4**

Property 5: Bug Condition — Swansea FTTP Seed Data

_For any_ query of Swansea (SA1 6AU) addresses in the seed data, at least one address SHALL have `technology_fttp=true`, enabling the backend to return FTTP plans (500/900/1000 Mbps) for that address.

**Validates: Requirements 2.5**

Property 6: Preservation — Keyword Speed Tier Filtering Unchanged

_For any_ user input that uses keyword-based speed terms ("fast", "gaming", "streaming", "standard", "basic") WITHOUT an explicit numeric speed, the `parsePreferences` function SHALL produce the same `speedTier` value as the original code, and `filterPlans` SHALL filter identically.

**Validates: Requirements 3.1**

Property 7: Preservation — Budget and Contract Filtering Unchanged

_For any_ user input with budget or contract preferences (and no speed-related changes), the `parsePreferences` and `filterPlans` functions SHALL produce identical results to the original code.

**Validates: Requirements 3.2, 3.3, 3.4**

Property 8: Preservation — Show All Plans Unchanged

_For any_ user input matching "show all plans" or "show all available", the system SHALL return all plans at the address without any filtering, identical to the original behavior.

**Validates: Requirements 3.2**

Property 9: Preservation — Existing Seed Data Unchanged

_For any_ query using London (SW1A 1AA) or Manchester (M1 1AE) addresses, the seed data SHALL return the same technology flags and resulting plan sets as before the fix.

**Validates: Requirements 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/components/AiChatPanel.tsx`

**1. Remove slice(0, 3) truncation in handlePreferencesStep**:
- Change `filtered.slice(0, 3).map(p => ({...}))` to `filtered.map(p => ({...}))` in the `summaryCards` construction
- This ensures all filtered plans are rendered as summary cards

**2. Remove slice(0, 3) truncation in sendMessage API response handler**:
- Change `data.summaryCards.slice(0, 3)` to `data.summaryCards` in the `setMessages` call within `sendMessage`
- This ensures API-returned summary cards are not truncated either

**3. Remove slice(0, 3) truncation in JSX rendering**:
- Change `msg.summaryCards.slice(0, 3).map(card => ...)` to `msg.summaryCards.map(card => ...)` in the JSX
- This ensures the rendering layer does not re-truncate cards

**4. Add minSpeed to PreferenceFilter interface**:
- Add `minSpeed: number | null` to the `PreferenceFilter` interface
- Initialize to `null` in `parsePreferences`

**5. Add explicit speed regex to parsePreferences**:
- Add regex `/(\d+)\s*(?:mbps|mb)/i` to extract numeric speed
- Set `filter.minSpeed` to the parsed integer value
- Place this after the keyword speed tier checks so explicit numbers take precedence

**6. Add minSpeed filtering to filterPlans**:
- After the `speedTier` filter block, add: if `filter.minSpeed !== null`, filter plans where `downloadSpeedMbps >= filter.minSpeed`

**7. Add speed-aware zero-match feedback in handlePreferencesStep**:
- When `filtered.length === 0` and `plans.length > 0`, check if the preference had a speed constraint
- If so, compute the fastest available speed from `plans` via `Math.max(...plans.map(p => p.downloadSpeedMbps))`
- Include the requested speed and fastest available speed in the message
- Example: "No plans matching 100+ Mbps are available at your address. The fastest available speed is 36 Mbps. Would you like to see all {N} available plans?"

**8. Add speed complaint detection in processGuidedFlowMessage at plan step**:
- Before the catch-all "Please click Select Plan" response, add pattern matching for speed complaints
- Patterns: `/(?:don'?t see|where|why|no|missing|can'?t find).*(?:\d+\s*mbps|fast|speed|100|500|900)/i` and similar
- When matched, respond with acknowledgment of the mismatch, explain technology limitations at the address, and offer "Show all plans" or "Try a different address"

**File**: `scripts/seed-broadband.sql`

**9. Enable FTTP for one Swansea address**:
- Update the first Swansea address (UPRN `A15099951235`, "BT Test Facility") to have `technology_fttp=true`
- This enables FTTP plans (500/900/1000 Mbps) at that address for testing
- All other Swansea addresses remain unchanged

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that exercise each defect scenario against the current (unfixed) code. Run these tests to observe failures and confirm the root causes.

**Test Cases**:
1. **Truncation Test**: Call `handlePreferencesStep` with 6 plans, verify that only 3 summary cards are created (will fail assertion that all 6 should be rendered — confirms defect 1)
2. **Explicit Speed Parse Test**: Call `parsePreferences("I need 100 Mbps")`, verify `minSpeed` is undefined/null (confirms defect 2 — no minSpeed field exists)
3. **Zero-Match Feedback Test**: Call `handlePreferencesStep` with speedTier='fast' on plans that are all 36 Mbps, verify the response message does NOT mention speed unavailability (confirms defect 3)
4. **Complaint Dismissal Test**: Call `processGuidedFlowMessage("I don't see any 100 Mbps plan")` at plan step, verify response is generic "Please click Select Plan" (confirms defect 4)
5. **Swansea Seed Data Test**: Query seed SQL for SA1 6AU addresses, verify none have `technology_fttp=true` (confirms defect 5)

**Expected Counterexamples**:
- Summary cards array length is 3 when filtered plans length is 6
- `parsePreferences` output has no `minSpeed` property
- Zero-match message is generic without speed context
- Plan step response to complaint is "Please click Select Plan"

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

Specifically:
- For defect 1: `summaryCards.length === filteredPlans.length` for any number of filtered plans
- For defect 2: `parsePreferences(text).minSpeed === N` for any text containing `N Mbps`
- For defect 3: response message contains speed info when zero-match with speed preference
- For defect 4: response acknowledges complaint when speed complaint pattern detected at plan step
- For defect 5: at least one SA1 6AU address has `technology_fttp=true`

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for keyword-based preferences, budget filtering, contract filtering, and "show all" — then write property-based tests capturing that behavior.

**Test Cases**:
1. **Keyword Speed Preservation**: Verify that `parsePreferences` with keyword inputs ("fast", "standard", "gaming", etc.) produces identical `speedTier` values before and after fix
2. **Budget Filter Preservation**: Verify that `parsePreferences` and `filterPlans` with budget-only inputs produce identical results
3. **Contract Filter Preservation**: Verify that `parsePreferences` and `filterPlans` with contract-only inputs produce identical results
4. **Show All Preservation**: Verify that "show all plans" returns all plans unchanged
5. **London/Manchester Seed Preservation**: Verify seed data for SW1A 1AA and M1 1AE addresses is unchanged

### Unit Tests

- Test `parsePreferences` extracts `minSpeed` from various explicit speed formats ("100 Mbps", "100mbps", "I need 100 mb speed", "at least 200 Mbps")
- Test `parsePreferences` returns `minSpeed: null` for keyword-only inputs
- Test `filterPlans` with `minSpeed` correctly filters plans by download speed
- Test `filterPlans` with `minSpeed` and `speedTier` together (minSpeed takes precedence or combines)
- Test summary card count equals filtered plan count (no truncation)
- Test zero-match message includes speed context when speed preference was set
- Test speed complaint patterns are detected at plan step
- Test non-complaint messages at plan step still get "Please click Select Plan"

### Property-Based Tests

- Generate random arrays of BroadbandPlan objects (1-20 plans) and verify summary card count always equals filtered plan count (fast-check)
- Generate random user text strings with embedded Mbps numbers and verify `parsePreferences` extracts `minSpeed` correctly (fast-check)
- Generate random `PreferenceFilter` objects with keyword-only speed tiers and verify `filterPlans` output matches original behavior (fast-check)
- Generate random budget/contract values and verify `parsePreferences` + `filterPlans` produce identical results to original (fast-check)

### Integration Tests

- End-to-end test: enter Manchester postcode, select address, request "100 Mbps", verify 100+ Mbps plan cards are visible
- End-to-end test: enter Swansea postcode, select FTTP-enabled address, verify FTTP plans appear
- End-to-end test: enter Swansea postcode, select copper-only address, request "fast", verify speed unavailability message
- End-to-end test: at plan step with only 36 Mbps plans, type "where are the 100 Mbps plans", verify helpful response
- End-to-end test: full guided flow through plan selection, add-ons, summary, and add to cart still works after fix
