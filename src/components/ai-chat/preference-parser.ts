import type { PreferenceFilter } from './types';
import type { BroadbandAddon, BroadbandPlan } from '@/types/broadband';

/** Parse user preference text into a PreferenceFilter */
export function parsePreferences(text: string): PreferenceFilter {
    const lower = text.toLowerCase().trim();
    const filter: PreferenceFilter = {
        speedTier: null,
        minSpeed: null, maxSpeed: null,
        minUploadSpeed: null, maxUploadSpeed: null,
        minBudget: null, maxBudget: null,
        maxContractMonths: null, minContractMonths: null,
        usageType: null, showAll: false,
    };

    if (lower.includes('show all plans') || lower.includes('show all available') || lower === 'show all') {
        filter.showAll = true;
        return filter;
    }

    // Speed keywords
    if (lower.includes('fast') || lower.includes('high speed') || lower.includes('gaming') || lower.includes('streaming')) {
        filter.speedTier = 'fast';
    } else if (lower.includes('standard') || lower.includes('basic') || lower.includes('light')) {
        filter.speedTier = 'standard';
    }

    // Helper: parse "greater than X", "less than X", "between X and Y", etc.
    const parseRange = (subject: string): { min: number | null; max: number | null } => {
        let min: number | null = null;
        let max: number | null = null;

        const rangeMatch = lower.match(new RegExp(`${subject}[^.]*?(?:between|from)\\s*(\\d+)\\s*(?:and|to|-|–)\\s*(\\d+)`, 'i'))
            || lower.match(new RegExp(`(\\d+)\\s*(?:to|-|–)\\s*(\\d+)\\s*(?:mbps|mb)?\\s*${subject}`, 'i'));
        if (rangeMatch) {
            min = parseInt(rangeMatch[1], 10);
            max = parseInt(rangeMatch[2], 10);
            return { min, max };
        }

        const gtMatch = lower.match(new RegExp(`${subject}[^.]*?(?:greater than|more than|over|above|at least|min(?:imum)?|exceeding)\\s*(\\d+)`, 'i'))
            || lower.match(new RegExp(`(?:greater than|more than|over|above|at least|min(?:imum)?|exceeding)\\s*(\\d+)\\s*(?:mbps|mb)?\\s*${subject}`, 'i'));
        if (gtMatch) {
            min = parseInt(gtMatch[1], 10);
            return { min, max };
        }

        const ltMatch = lower.match(new RegExp(`${subject}[^.]*?(?:less than|under|below|up to|max(?:imum)?|no more than)\\s*(\\d+)`, 'i'))
            || lower.match(new RegExp(`(?:less than|under|below|up to|max(?:imum)?|no more than)\\s*(\\d+)\\s*(?:mbps|mb)?\\s*${subject}`, 'i'));
        if (ltMatch) {
            max = parseInt(ltMatch[1], 10);
        }

        return { min, max };
    };

    // Upload speed
    const uploadRange = parseRange('upload');
    if (uploadRange.min !== null) filter.minUploadSpeed = uploadRange.min;
    if (uploadRange.max !== null) filter.maxUploadSpeed = uploadRange.max;
    if (filter.minUploadSpeed === null && filter.maxUploadSpeed === null) {
        const uploadDirect = lower.match(/upload\s*(?:speed\s*)?(?:greater than|over|above|at least|min(?:imum)?)?\s*(\d+)\s*(?:mbps|mb)?/i)
            || lower.match(/(\d+)\s*(?:mbps|mb)\s*upload/i);
        if (uploadDirect) filter.minUploadSpeed = parseInt(uploadDirect[1], 10);
    }

    // Download speed
    const downloadRange = parseRange('download');
    if (downloadRange.min !== null) filter.minSpeed = downloadRange.min;
    if (downloadRange.max !== null) filter.maxSpeed = downloadRange.max;
    if (filter.minSpeed === null && filter.maxSpeed === null) {
        const downloadDirect = lower.match(/download\s*(?:speed\s*)?(?:greater than|over|above|at least|min(?:imum)?)?\s*(\d+)\s*(?:mbps|mb)?/i)
            || lower.match(/(\d+)\s*(?:mbps|mb)\s*download/i);
        if (downloadDirect) filter.minSpeed = parseInt(downloadDirect[1], 10);
    }

    // Generic speed (no "upload" or "download" keyword) — treat as download
    if (filter.minSpeed === null && filter.maxSpeed === null && filter.minUploadSpeed === null && filter.maxUploadSpeed === null) {
        const genericRange = lower.match(/(?:between|from)\s*(\d+)\s*(?:and|to|-|–)\s*(\d+)\s*(?:mbps|mb)/i)
            || lower.match(/(\d+)\s*(?:to|-|–)\s*(\d+)\s*(?:mbps|mb)/i);
        if (genericRange) {
            filter.minSpeed = parseInt(genericRange[1], 10);
            filter.maxSpeed = parseInt(genericRange[2], 10);
        } else {
            const gtGeneric = lower.match(/(?:greater than|more than|over|above|at least)\s*(\d+)\s*(?:mbps|mb)/i);
            const ltGeneric = lower.match(/(?:less than|under|below|up to)\s*(\d+)\s*(?:mbps|mb)/i);
            if (gtGeneric) filter.minSpeed = parseInt(gtGeneric[1], 10);
            if (ltGeneric) filter.maxSpeed = parseInt(ltGeneric[1], 10);
            if (!gtGeneric && !ltGeneric) {
                const plainSpeed = lower.match(/(\d+)\s*(?:mbps|mb)/i);
                if (plainSpeed) filter.minSpeed = parseInt(plainSpeed[1], 10);
            }
        }
    }

    // Price / budget
    const priceRange = lower.match(/(?:between|from)\s*£?\s*(\d+)\s*(?:and|to|-|–)\s*£?\s*(\d+)/i)
        || lower.match(/£?\s*(\d+)\s*(?:to|-|–)\s*£?\s*(\d+)/i);
    if (priceRange) {
        filter.minBudget = parseInt(priceRange[1], 10);
        filter.maxBudget = parseInt(priceRange[2], 10);
    } else {
        if (lower.includes('budget') || lower.includes('cheap') || lower.includes('affordable') || lower.includes('low cost')) {
            filter.maxBudget = 35;
        }
        const budgetMax = lower.match(/(?:under|below|max|up to|less than|no more than)\s*£?\s*(\d+)/);
        if (budgetMax) filter.maxBudget = parseInt(budgetMax[1], 10);
        const budgetMin = lower.match(/(?:over|above|at least|more than|min(?:imum)?)\s*£?\s*(\d+)/);
        if (budgetMin && !filter.maxBudget) filter.minBudget = parseInt(budgetMin[1], 10);
    }

    // Contract keywords
    if (lower.includes('short contract') || lower.includes('no contract') || lower.includes('flexible') || lower.includes('month-to-month')) {
        filter.maxContractMonths = 12;
    }
    const contractMatch = lower.match(/(\d+)\s*month/);
    if (contractMatch) {
        const months = parseInt(contractMatch[1], 10);
        if (lower.includes('less than') || lower.includes('under') || lower.includes('max')) {
            filter.maxContractMonths = months;
        } else if (lower.includes('more than') || lower.includes('over') || lower.includes('at least')) {
            filter.minContractMonths = months;
        } else {
            filter.maxContractMonths = months;
        }
    }

    // Usage type
    if (lower.includes('gaming')) filter.usageType = 'gaming';
    else if (lower.includes('streaming')) filter.usageType = 'streaming';
    else if (lower.includes('work') || lower.includes('office')) filter.usageType = 'work';

    return filter;
}

/** Filter plans based on PreferenceFilter */
export function filterPlans(plans: BroadbandPlan[], filter: PreferenceFilter): BroadbandPlan[] {
    if (filter.showAll) return plans;

    let filtered = [...plans];

    if (filter.speedTier === 'fast') {
        filtered = filtered.filter(p => p.downloadSpeedMbps >= 100);
    } else if (filter.speedTier === 'standard') {
        filtered = filtered.filter(p => p.downloadSpeedMbps < 100);
    }

    if (filter.minSpeed !== null) filtered = filtered.filter(p => p.downloadSpeedMbps >= filter.minSpeed!);
    if (filter.maxSpeed !== null) filtered = filtered.filter(p => p.downloadSpeedMbps <= filter.maxSpeed!);
    if (filter.minUploadSpeed !== null) filtered = filtered.filter(p => p.uploadSpeedMbps >= filter.minUploadSpeed!);
    if (filter.maxUploadSpeed !== null) filtered = filtered.filter(p => p.uploadSpeedMbps <= filter.maxUploadSpeed!);

    if (filter.minBudget !== null) filtered = filtered.filter(p => p.monthlyPrice >= filter.minBudget!);
    if (filter.maxBudget !== null) {
        filtered = filtered.filter(p => p.monthlyPrice <= filter.maxBudget!);
        filtered.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
    }

    if (filter.maxContractMonths !== null) filtered = filtered.filter(p => p.contractLengthMonths <= filter.maxContractMonths!);
    if (filter.minContractMonths !== null) filtered = filtered.filter(p => p.contractLengthMonths >= filter.minContractMonths!);

    return filtered;
}

/** Filter addons based on PreferenceFilter */
export function filterAddons(addons: BroadbandAddon[], filter: PreferenceFilter): BroadbandAddon[] {
    if (filter.showAll) return addons;

    let filtered = [...addons];

    if (filter.minBudget !== null) filtered = filtered.filter(a => a.monthlyPrice >= filter.minBudget!);
    if (filter.maxBudget !== null) {
        filtered = filtered.filter(a => a.monthlyPrice <= filter.maxBudget!);
        filtered.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
    }

    return filtered;
}
