import type { GuidedFlowState, GuidedFlowStep } from './types';

export const INITIAL_GUIDED_FLOW_STATE: GuidedFlowState = {
    active: false,
    currentStep: 'postcode',
};

export const GUIDED_FLOW_TRIGGERS = [
    'broadband availability', 'get broadband', 'buy broadband',
    'check my address', 'broadband at my address', 'order broadband',
    'purchase broadband', 'sign up for broadband', 'broadband for my home',
    'check broadband', 'broadband coverage',
    'suggest broadband', 'broadband items', 'broadband plans',
    'show broadband', 'broadband deals', 'broadband packages',
    'internet plans', 'fibre plans', 'fibre broadband',
    'compare broadband', 'broadband options', 'broadband pricing',
    'suggest me some broadband', 'recommend broadband',
];

export const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export const STEP_ORDER: GuidedFlowStep[] = ['postcode', 'address', 'preferences', 'plan', 'addons', 'tv_packages', 'sim_plans', 'home_phone', 'summary'];

export const QUICK_ACTIONS = [
    { label: '🔥 Best deals', msg: 'Show me products with the best deals' },
    { label: '📱 Phones', msg: 'Show me all phones' },
    { label: '🌐 Broadband', msg: 'Show me broadband plans' },
    { label: '🛒 My cart', msg: 'What is in my cart?' },
    { label: '🏷️ Apply coupon', msg: 'Can you apply a coupon for my cart?' },
];

export const DEFAULT_BROADBAND_CHIPS = ['Check availability at my address', 'Compare plans', 'View add-ons', 'See pricing summary'];
export const DEFAULT_PRODUCT_CHIPS = ['Compare with similar', 'Add to cart', 'Show deals', 'View specs'];
