import type { BroadbandPlan } from '@/types/broadband';

/** Plan feature query patterns to detect user asking about plan details */
const PLAN_FEATURE_PATTERNS = [
  'features', 'details', 'what does this plan include', 'tell me more',
  'plan details', 'plan features', 'what\'s included', 'what is included',
  'more info', 'more information', 'more about', 'plan info',
  'what do i get', 'what comes with', 'specs', 'specifications',
];

/** Detect if a message is asking about plan features/details */
export function isPlanFeatureQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return PLAN_FEATURE_PATTERNS.some(p => lower.includes(p));
}

/** Format a BroadbandPlan's full attributes as a bulleted detail string */
export function formatPlanDetails(plan: BroadbandPlan): string {
  const lines: string[] = [
    `📋 **${plan.name}** — Full Details\n`,
    `• Download Speed: ${plan.downloadSpeedMbps} Mbps`,
    `• Upload Speed: ${plan.uploadSpeedMbps} Mbps`,
    `• Technology: ${plan.technologyType}`,
    `• Contract Length: ${plan.contractLengthMonths} months`,
    `• Monthly Price: £${plan.monthlyPrice.toFixed(2)}/mo`,
  ];
  if (plan.promotionalLabel) {
    lines.push(`• Promotion: ${plan.promotionalLabel}`);
  }
  if (plan.includesRouter && plan.routerName) {
    lines.push(`• Router: ${plan.routerName} (included)`);
  } else if (plan.includesRouter) {
    lines.push(`• Router: Included`);
  } else {
    lines.push(`• Router: Not included`);
  }
  lines.push(`• Activation Fee: £${plan.activationFee.toFixed(2)}`);
  if (plan.speedGuaranteeMbps != null) {
    lines.push(`• Speed Guarantee: ${plan.speedGuaranteeMbps} Mbps`);
  }
  if (plan.outOfContractPrice != null) {
    lines.push(`• Out-of-Contract Price: £${plan.outOfContractPrice.toFixed(2)}/mo`);
  }
  return lines.join('\n');
}
