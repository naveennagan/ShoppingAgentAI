import type { BroadbandAddress, BroadbandPlan } from '@/types/broadband';

// ── Interfaces ──────────────────────────────────────────────────────────

export interface AiChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onWidthChange: (width: number) => void;
}

export interface RawSummaryCard {
    type: 'product' | 'broadband' | 'addon' | 'tv_package' | 'sim_plan' | 'home_phone';
    id: string;
    name: string;
    price?: number;
    brand?: string;
    rating?: number;
    downloadSpeed?: string;
    uploadSpeed?: string;
    monthlyPrice?: number;
    contractLength?: string;
    promotionalLabel?: string | null;
    description?: string;
    index?: number;
    // TV package fields
    channelCount?: number;
    // SIM plan fields
    maxSpeed?: string;
    isUnlimited?: boolean;
    // Home phone fields
    includesCallsTo?: string;
}

export interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    comparison?: {
        products: string[];
        rows: { field: string; values: string[] }[];
    };
    summaryCards?: RawSummaryCard[];
    suggestedActions?: string[];
}

export type GuidedFlowStep = 'postcode' | 'address' | 'preferences' | 'plan' | 'addons' | 'tv_packages' | 'sim_plans' | 'home_phone' | 'summary';

export interface GuidedFlowState {
    active: boolean;
    currentStep: GuidedFlowStep;
    postcode?: string;
    selectedAddress?: BroadbandAddress;
    preferences?: PreferenceFilter;
    selectedPlan?: BroadbandPlan;
    selectedAddons?: string[];
    selectedTvPackageId?: string;
    selectedSimPlanId?: string;
    selectedHomePhoneId?: string;
}

export interface PreferenceFilter {
    speedTier: 'fast' | 'standard' | null;
    minSpeed: number | null;
    maxSpeed: number | null;
    minUploadSpeed: number | null;
    maxUploadSpeed: number | null;
    minBudget: number | null;
    maxBudget: number | null;
    maxContractMonths: number | null;
    minContractMonths: number | null;
    usageType: string | null;
    showAll: boolean;
}
