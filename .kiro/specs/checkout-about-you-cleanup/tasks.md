# Tasks for Checkout About You Cleanup Bugfix

## Task 1: Remove OrderSummaryBar from About You step
- [x] 1.1 Remove the `<OrderSummaryBar session={session} onCancelDevices={() => setCancelTarget('devices')} onCancelBroadband={() => setCancelTarget('broadband')} />` JSX line from the `{step === 'about' && (...)}` block in `src/app/checkout/page.tsx`
- [x] 1.2 Remove the `OrderSummaryBar` function component definition from the bottom of `src/app/checkout/page.tsx` (dead code cleanup)

## Task 2: Write tests to verify the fix
- [x] 2.1 [PBT: Property 1] Write an exploratory test that renders the checkout page on the About You step with a mock session containing devices and broadband, and asserts that no OrderSummaryBar content (device/broadband summary text) is present
- [x] 2.2 [PBT: Property 2] Write a preservation test that renders the checkout page on the payment step and asserts that `DevicePaymentSection` and `BroadbandSection` still render, and that the compact about-you summary bar with Edit button still appears
