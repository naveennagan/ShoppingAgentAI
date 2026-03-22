# Bugfix Requirements Document

## Introduction

The broadband chat experience has four related bugs that degrade the user experience when a customer is browsing broadband plans. The most impactful bug is that the chat only renders 3 summary cards (via `filtered.slice(0, 3)`) even when more plans are available — since plans are sorted by price, the cheapest 36 Mbps plans always appear and the 100 Mbps plans are hidden from view despite the message saying "Here are 6 broadband plans." Additionally, when a user asks for a specific speed like "100 Mbps", the system (1) fails to parse the explicit speed number from the request, (2) doesn't explain when no plans match the requested speed, and (3) dismisses the user's complaint about missing plans with a generic "Please click Select Plan" response instead of acknowledging the limitation. Together, these bugs make the broadband chat feel broken and unhelpful.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the chat displays broadband plans after filtering, THE summary card rendering uses `filtered.slice(0, 3)` which truncates the visible plan cards to only 3, even when the message text says more plans are available (e.g. "Here are 6 broadband plans"). Since plans are sorted by price ascending, the 3 cheapest plans (all 36 Mbps SOGEA) are shown and the 100 Mbps FTTC plans are hidden — making it appear that 100 Mbps plans don't exist even though the backend returned them. This is the primary reason the user cannot see 100 Mbps plans in the chat while the manual broadband page (which renders all plans) shows them correctly.

1.2 WHEN a user requests a specific speed using an explicit number (e.g. "100 Mbps", "I need 100 mbps speed", "at least 200 Mbps") THEN the system ignores the numeric speed value because `parsePreferences` only recognizes keyword-based speed tiers ("fast", "gaming", "streaming") and does not extract explicit Mbps numbers from the input

1.3 WHEN the user's speed preference (whether keyword-based or explicit numeric) results in zero matching plans at their address but other plans are available THEN the system displays the lower-speed plans without any explanation of why the requested speed is unavailable, giving the user no indication that their preference was not met

1.4 WHEN the user complains about missing plans (e.g. "I don't see any 100 Mbps plan here") during the plan selection step THEN the system responds with "Please click Select Plan" instead of acknowledging the mismatch and explaining why certain speeds are not available at their address due to technology limitations

1.5 WHEN the Swansea test address (SA1 6AU) is used for testing THEN only SOGEA plans (36 Mbps) are returned because all Swansea addresses have `technology_copper=true, technology_fttp=false, technology_sogea=false`, which maps to SOGEA/FTTC plans but the actual seed data flags only enable copper-based plans, preventing testers from exercising the full range of plan speeds at this postcode

### Expected Behavior (Correct)

2.1 WHEN the chat displays broadband plans, THE summary card rendering SHALL display ALL filtered plans as summary cards (removing the `slice(0, 3)` truncation) so that every plan returned by the backend is visible and selectable by the user

2.2 WHEN a user requests a specific speed using an explicit number (e.g. "100 Mbps", "I need 100 mbps speed", "at least 200 Mbps") THEN the system SHALL extract the numeric speed value via a regex pattern like `/(\d+)\s*(?:mbps|mb)/i` and use it as a `minSpeed` filter so that only plans with `downloadSpeedMbps >= requestedSpeed` are considered matching

2.3 WHEN the user's speed preference (whether keyword-based or explicit numeric) results in zero matching plans at their address but other plans are available THEN the system SHALL inform the user that no plans matching their requested speed are available at their address, state the fastest available speed, and offer to show all available plans (e.g. "No plans matching 100 Mbps are available at your address. The fastest available speed is 36 Mbps. Here are the available plans:")

2.4 WHEN the user complains about missing plans or expresses dissatisfaction about available speeds during the plan selection step (e.g. "I don't see any 100 Mbps plan here", "where are the faster plans", "why no 100 Mbps") THEN the system SHALL detect this as a speed complaint, acknowledge the issue, and explain that the available speeds are determined by the technology infrastructure at their address, then offer to show all available plans or allow the user to try a different address

2.5 WHEN the Swansea test address (SA1 6AU) is used for testing THEN at least one Swansea address SHALL have `technology_fttp=true` enabled in the seed data so that testers can verify the full range of plan speeds (36/100/500/900/1000 Mbps) without needing to switch to a different postcode

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user requests speed using keywords like "fast", "gaming", "streaming", "standard", or "basic" THEN the system SHALL CONTINUE TO map these to the existing `speedTier` filter categories and return plans accordingly

3.2 WHEN a user requests "show all plans" or "show all available" THEN the system SHALL CONTINUE TO return all plans available at the address without any speed filtering

3.3 WHEN a user provides budget preferences (e.g. "under £35", "budget-friendly") THEN the system SHALL CONTINUE TO filter plans by price correctly

3.4 WHEN a user provides contract length preferences (e.g. "short contract", "12 month") THEN the system SHALL CONTINUE TO filter plans by contract length correctly

3.5 WHEN plans matching the user's preferences are found at their address THEN the system SHALL CONTINUE TO display them as summary cards with "Select Plan" buttons as it does today

3.6 WHEN the London (SW1A 1AA) and Manchester (M1 1AE) test addresses are used THEN the system SHALL CONTINUE TO return the same set of plans as before (SOGEA+FTTP for London, all technologies for Manchester)

3.7 WHEN the user selects a plan and proceeds through add-ons to summary THEN the guided flow SHALL CONTINUE TO work identically through the remaining steps (add-ons, summary, add to cart)
