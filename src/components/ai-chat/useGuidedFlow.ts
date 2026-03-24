import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Product } from '@/lib/products';
import type { BroadbandAddress, BroadbandAddon, BroadbandPlan, TvPackage, SimPlan, HomePhoneService } from '@/types/broadband';
import { isPlanFeatureQuery, formatPlanDetails } from '@/lib/plan-feature-utils';
import {
    isInstallationQuery, isCheckAppointmentQuery, parseSlotSelection,
    formatAvailableSlots, formatAppointmentDetails, formatBookingConfirmation,
} from '@/lib/installation-query-utils';
import type { ChatMessage, GuidedFlowState, GuidedFlowStep, PreferenceFilter, RawSummaryCard } from './types';
import { INITIAL_GUIDED_FLOW_STATE, GUIDED_FLOW_TRIGGERS, UK_POSTCODE_REGEX, STEP_ORDER } from './constants';
import { parsePreferences, filterPlans, filterAddons } from './preference-parser';

export function useGuidedFlow() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'ai', text: 'Hi! I\'m your AI shopping assistant. Ask me about products, deals, or let me help manage your cart.' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(true);
    const [guidedFlow, setGuidedFlow] = useState<GuidedFlowState>(INITIAL_GUIDED_FLOW_STATE);
    const [pendingSlots, setPendingSlots] = useState<Array<{ date: string; slot: string; timeRange: string; available: boolean }>>([]);
    const [lastAppointmentId, setLastAppointmentId] = useState<string | null>(null);
    const [broadbandPlans, setBroadbandPlans] = useState<BroadbandPlan[]>([]);

    const guidedFlowRef = useRef(guidedFlow);
    useEffect(() => { guidedFlowRef.current = guidedFlow; }, [guidedFlow]);

    const router = useRouter();
    const { addToCart, clearCart, updateQuantity, removeFromCart, items: cart, applyCoupon, removeCoupon, appliedCoupon, addBroadbandServiceToCart } = useCart();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Listen for broadband plans loaded on the broadband page
    useEffect(() => {
        const handler = (e: CustomEvent<BroadbandPlan[]>) => setBroadbandPlans(e.detail ?? []);
        window.addEventListener('broadband-plans-loaded' as any, handler);
        return () => window.removeEventListener('broadband-plans-loaded' as any, handler);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const isGuidedFlowTrigger = (text: string): boolean => {
        const lower = text.toLowerCase();
        if (GUIDED_FLOW_TRIGGERS.some(trigger => lower.includes(trigger))) return true;
        if (/\bbroadband\b/.test(lower) && !lower.includes('cancel')) return true;
        return false;
    };

    const addAiMessage = useCallback((text: string, extras?: Partial<ChatMessage>) => {
        setMessages(prev => [...prev, { role: 'ai', text, ...extras }]);
    }, []);

    // ── Step handlers ───────────────────────────────────────────────────

    const startGuidedFlow = useCallback(async (_userMessage: string) => {
        setGuidedFlow({ ...INITIAL_GUIDED_FLOW_STATE, active: true, currentStep: 'postcode' });
        addAiMessage("I can help you find the right broadband plan! Let's start by checking what's available at your address. Please enter your UK postcode (e.g. SW1A 1AA).", {
            suggestedActions: ['Cancel'],
        });
    }, [addAiMessage]);

    const handlePostcodeStep = useCallback(async (postcode: string) => {
        setGuidedFlow(prev => ({ ...prev, postcode, currentStep: 'address' }));
        addAiMessage(`Looking up addresses for ${postcode.toUpperCase()}...`);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const addresses = await apiClient.getAddresses(postcode);
            if (addresses.length === 0) {
                addAiMessage('No addresses found for that postcode. Please try a different one.', {
                    suggestedActions: ['Try again', 'Cancel'],
                });
                setGuidedFlow(prev => ({ ...prev, currentStep: 'postcode', postcode: undefined }));
                return;
            }
            const addressOptions = addresses.map((a, i) => `• ${i + 1}. ${a.formattedAddress}`).join('\n');
            addAiMessage(
                `I found ${addresses.length} address${addresses.length > 1 ? 'es' : ''}:\n\n${addressOptions}\n\nPlease type the number of your address to select it.`,
                {
                    suggestedActions: addresses.map((_, i) => `${i + 1}`).concat(['Go back']),
                    _guidedAddresses: addresses,
                } as any
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to look up addresses';
            addAiMessage(`Sorry, there was an error looking up addresses: ${msg}`, {
                suggestedActions: ['Try again', 'Cancel'],
            });
            setGuidedFlow(prev => ({ ...prev, currentStep: 'postcode', postcode: undefined }));
        }
    }, [addAiMessage]);

    const handleAddressStep = useCallback(async (address: BroadbandAddress) => {
        setGuidedFlow(prev => ({ ...prev, selectedAddress: address, currentStep: 'preferences' }));
        addAiMessage(
            `Great, you selected ${address.formattedAddress}. What are you looking for in a broadband plan? You can tell me about your speed needs, budget, contract preference, or usage type — or just show all plans.`,
            { suggestedActions: ['Fast speeds', 'Budget-friendly', 'Short contract', 'Show all plans'] }
        );
    }, [addAiMessage]);

    const handlePreferencesStep = useCallback(async (preferences: PreferenceFilter) => {
        const flow = guidedFlowRef.current;
        setGuidedFlow(prev => ({ ...prev, preferences, currentStep: 'plan' }));
        addAiMessage(`Checking broadband availability at ${flow.selectedAddress?.formattedAddress}...`);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const plans = await apiClient.getPlansForAddress(flow.selectedAddress!.uprn);
            if (plans.length === 0) {
                addAiMessage('Unfortunately, no broadband plans are available at this address.', {
                    suggestedActions: ['Go back', 'Cancel'],
                });
                setGuidedFlow(prev => ({ ...prev, currentStep: 'preferences', preferences: undefined }));
                return;
            }

            const filtered = filterPlans(plans, preferences);

            if (filtered.length === 0) {
                const hasSpeedConstraint = preferences.speedTier !== null || preferences.minSpeed !== null;
                if (hasSpeedConstraint && plans.length > 0) {
                    const fastestAvailable = Math.max(...plans.map(p => p.downloadSpeedMbps));
                    const requestedDesc = preferences.minSpeed !== null
                        ? `${preferences.minSpeed}+ Mbps`
                        : preferences.speedTier === 'fast' ? '100+ Mbps' : 'your requested speed';
                    const allCards: RawSummaryCard[] = plans.map(p => ({
                        type: 'broadband' as const, id: p.planId, name: p.name,
                        downloadSpeed: `${p.downloadSpeedMbps} Mbps`, uploadSpeed: `${p.uploadSpeedMbps} Mbps`,
                        monthlyPrice: p.monthlyPrice, contractLength: `${p.contractLengthMonths} months`,
                        promotionalLabel: p.promotionalLabel ?? null,
                    }));
                    addAiMessage(
                        `No plans matching ${requestedDesc} are available at your address. The fastest available speed is ${fastestAvailable} Mbps. Here are the ${plans.length} available plans:`,
                        { summaryCards: allCards, suggestedActions: ['Show all plans', 'Go back', 'Cancel'], _guidedPlans: plans } as any
                    );
                } else {
                    addAiMessage(
                        `I couldn't find any plans matching your preferences. Would you like to broaden your criteria or view all ${plans.length} available plans?`,
                        { suggestedActions: ['Show all plans', 'Go back', 'Cancel'], _guidedPlans: plans } as any
                    );
                    setGuidedFlow(prev => ({ ...prev, currentStep: 'preferences', preferences: undefined }));
                }
                return;
            }

            const summaryCards: RawSummaryCard[] = filtered.map(p => ({
                type: 'broadband' as const, id: p.planId, name: p.name,
                downloadSpeed: `${p.downloadSpeedMbps} Mbps`, uploadSpeed: `${p.uploadSpeedMbps} Mbps`,
                monthlyPrice: p.monthlyPrice, contractLength: `${p.contractLengthMonths} months`,
                promotionalLabel: p.promotionalLabel ?? null,
            }));

            const filterDesc = preferences.showAll ? '' : ` matching your preferences`;
            addAiMessage(
                `Here are ${filtered.length} broadband plan${filtered.length > 1 ? 's' : ''}${filterDesc}. Click "Select Plan" to choose one.`,
                { summaryCards, suggestedActions: ['Show all plans', 'Go back', 'Cancel'], _guidedPlans: filtered } as any
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to check broadband availability';
            addAiMessage(`Sorry, there was an error checking availability: ${msg}`, {
                suggestedActions: ['Try again', 'Go back', 'Cancel'],
            });
            setGuidedFlow(prev => ({ ...prev, currentStep: 'preferences', preferences: undefined }));
        }
    }, [addAiMessage]);

    const handlePlanStep = useCallback(async (plan: BroadbandPlan) => {
        setGuidedFlow(prev => ({ ...prev, selectedPlan: plan, selectedAddons: [], currentStep: 'addons' }));
        addAiMessage(`You selected ${plan.name} (£${plan.monthlyPrice.toFixed(2)}/mo). Let me check available add-ons...`);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const addons = await apiClient.getAddons(plan.planType);
            if (addons.length === 0) {
                addAiMessage('No add-ons are available for this plan. Here\'s your summary:', {
                    suggestedActions: ['Continue', 'Go back', 'Cancel'],
                });
                return;
            }
            const addonCards: RawSummaryCard[] = addons.map((a, i) => ({
                type: 'addon' as const, id: a.id, name: a.name,
                monthlyPrice: a.monthlyPrice, description: a.description, index: i + 1,
            }));
            const addonChips = addons.map(a => `Add ${a.name} (£${a.monthlyPrice.toFixed(2)}/mo)`);
            addAiMessage(
                `Here are ${addons.length} available add-on${addons.length > 1 ? 's' : ''} for your plan. Type the number(s) to add, or continue.`,
                { summaryCards: addonCards, suggestedActions: [...addonChips.slice(0, 3), 'Continue'], _guidedAddons: addons } as any
            );
        } catch {
            addAiMessage('Could not load add-ons. You can continue.', {
                suggestedActions: ['Continue', 'Go back', 'Cancel'],
            });
        }
    }, [addAiMessage]);

    const fetchAndDisplayAddons = useCallback(async (addonPreferences: PreferenceFilter) => {
        const flow = guidedFlowRef.current;
        if (!flow.selectedPlan) return;
        addAiMessage('Let me check available add-ons...');
        try {
            const { apiClient } = await import('@/lib/api-client');
            const addons = await apiClient.getAddons(flow.selectedPlan.planType);
            if (addons.length === 0) {
                addAiMessage('No add-ons are available for this plan. Ready to continue?', {
                    suggestedActions: ['Continue', 'Go back', 'Cancel'],
                });
                return;
            }
            const filtered = filterAddons(addons, addonPreferences);
            if (filtered.length === 0) {
                addAiMessage(
                    `No add-ons match your preferences. Would you like to view all ${addons.length} available add-ons or continue?`,
                    { suggestedActions: ['Show all add-ons', 'Continue', 'Go back'], _guidedAddons: addons } as any
                );
                return;
            }
            const addonCards: RawSummaryCard[] = filtered.map((a, i) => ({
                type: 'addon' as const, id: a.id, name: a.name,
                monthlyPrice: a.monthlyPrice, description: a.description, index: i + 1,
            }));
            const addonChips = filtered.map(a => `Add ${a.name} (£${a.monthlyPrice.toFixed(2)}/mo)`);
            const filterDesc = addonPreferences.showAll ? '' : ' matching your preferences';
            addAiMessage(
                `Here are ${filtered.length} add-on${filtered.length > 1 ? 's' : ''}${filterDesc}. Type the number(s) to add, or continue.`,
                { summaryCards: addonCards, suggestedActions: [...addonChips.slice(0, 3), 'Show all add-ons', 'Continue'], _guidedAddons: addons } as any
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to load add-ons';
            addAiMessage(`Sorry, there was an error loading add-ons: ${msg}`, {
                suggestedActions: ['Try again', 'Continue', 'Go back'],
            });
        }
    }, [addAiMessage]);

    // ── TV / SIM / Home Phone step handlers ─────────────────────────────

    const handleTvPackagesStep = useCallback(async () => {
        setGuidedFlow(prev => ({ ...prev, currentStep: 'tv_packages' }));
        addAiMessage('Let me check available TV packages...');
        try {
            const { apiClient } = await import('@/lib/api-client');
            const packages = await apiClient.getTvPackages();
            if (packages.length === 0) {
                addAiMessage('No TV packages are available. Moving on to SIM plans...', {
                    suggestedActions: ['Continue', 'Go back'],
                });
                return;
            }
            const cards: RawSummaryCard[] = packages.map((p, i) => ({
                type: 'tv_package' as const, id: p.id, name: p.name,
                monthlyPrice: p.monthlyPrice, description: p.description,
                channelCount: p.channelCount, index: i + 1,
            }));
            addAiMessage(
                `Here are ${packages.length} TV package${packages.length > 1 ? 's' : ''} you can add. Select one or skip to continue.`,
                { summaryCards: cards, suggestedActions: ['Skip', 'Go back'], _guidedTvPackages: packages } as any
            );
        } catch {
            addAiMessage('Could not load TV packages. You can continue to the next step.', {
                suggestedActions: ['Continue', 'Go back'],
            });
        }
    }, [addAiMessage]);

    const handleSimPlansStep = useCallback(async () => {
        setGuidedFlow(prev => ({ ...prev, currentStep: 'sim_plans' }));
        addAiMessage('Let me check available SIM plans...');
        try {
            const { apiClient } = await import('@/lib/api-client');
            const plans = await apiClient.getSimPlans();
            if (plans.length === 0) {
                addAiMessage('No SIM plans are available. Moving on to home phone services...', {
                    suggestedActions: ['Continue', 'Go back'],
                });
                return;
            }
            const cards: RawSummaryCard[] = plans.map((p, i) => ({
                type: 'sim_plan' as const, id: p.id, name: p.name,
                monthlyPrice: p.monthlyPrice, description: p.description,
                maxSpeed: p.maxSpeed, isUnlimited: p.isUnlimited, index: i + 1,
            }));
            addAiMessage(
                `Here are ${plans.length} SIM plan${plans.length > 1 ? 's' : ''} you can add. Select one or skip to continue.`,
                { summaryCards: cards, suggestedActions: ['Skip', 'Go back'], _guidedSimPlans: plans } as any
            );
        } catch {
            addAiMessage('Could not load SIM plans. You can continue to the next step.', {
                suggestedActions: ['Continue', 'Go back'],
            });
        }
    }, [addAiMessage]);

    const handleHomePhoneStep = useCallback(async () => {
        setGuidedFlow(prev => ({ ...prev, currentStep: 'home_phone' }));
        addAiMessage('Let me check available home phone services...');
        try {
            const { apiClient } = await import('@/lib/api-client');
            const services = await apiClient.getHomePhoneServices();
            if (services.length === 0) {
                addAiMessage('No home phone services are available. Let\'s see your summary.', {
                    suggestedActions: ['Continue to summary', 'Go back'],
                });
                return;
            }
            const cards: RawSummaryCard[] = services.map((s, i) => ({
                type: 'home_phone' as const, id: s.id, name: s.name,
                monthlyPrice: s.monthlyPrice, description: s.description,
                includesCallsTo: s.includesCallsTo, index: i + 1,
            }));
            addAiMessage(
                `Here are ${services.length} home phone service${services.length > 1 ? 's' : ''} you can add. Select one or skip to continue.`,
                { summaryCards: cards, suggestedActions: ['Skip', 'Go back'], _guidedHomePhoneServices: services } as any
            );
        } catch {
            addAiMessage('Could not load home phone services. You can continue to your summary.', {
                suggestedActions: ['Continue to summary', 'Go back'],
            });
        }
    }, [addAiMessage]);

    const handleSummaryStep = useCallback(() => {
        const flow = guidedFlowRef.current;
        if (!flow.selectedPlan) return;
        setGuidedFlow(prev => ({ ...prev, currentStep: 'summary' }));

        const plan = flow.selectedPlan!;
        const addonIds = flow.selectedAddons ?? [];
        let addonTotal = 0;
        const addonLines: string[] = [];

        const lastAddonsMsg = messages.slice().reverse().find((m: any) => m._guidedAddons);
        const allAddons: BroadbandAddon[] = (lastAddonsMsg as any)?._guidedAddons ?? [];
        for (const id of addonIds) {
            const addon = allAddons.find(a => a.id === id || `Add ${a.name} (£${a.monthlyPrice.toFixed(2)}/mo)` === id);
            if (addon) {
                addonTotal += addon.monthlyPrice;
                addonLines.push(`  • ${addon.name}: £${addon.monthlyPrice.toFixed(2)}/mo`);
            }
        }

        // TV package
        let tvTotal = 0;
        let tvLine = '';
        if (flow.selectedTvPackageId) {
            const tvMsg = messages.slice().reverse().find((m: any) => m._guidedTvPackages);
            const tvPackages: TvPackage[] = (tvMsg as any)?._guidedTvPackages ?? [];
            const tv = tvPackages.find(p => p.id === flow.selectedTvPackageId);
            if (tv) { tvTotal = tv.monthlyPrice; tvLine = `📺 TV: ${tv.name}${tv.monthlyPrice > 0 ? ` — £${tv.monthlyPrice.toFixed(2)}/mo` : ' — Free'}`; }
        }

        // SIM plan
        let simTotal = 0;
        let simLine = '';
        if (flow.selectedSimPlanId) {
            const simMsg = messages.slice().reverse().find((m: any) => m._guidedSimPlans);
            const simPlans: SimPlan[] = (simMsg as any)?._guidedSimPlans ?? [];
            const sim = simPlans.find(p => p.id === flow.selectedSimPlanId);
            if (sim) { simTotal = sim.monthlyPrice; simLine = `📱 SIM: ${sim.name} — £${sim.monthlyPrice.toFixed(2)}/mo`; }
        }

        // Home phone
        let phoneTotal = 0;
        let phoneLine = '';
        if (flow.selectedHomePhoneId) {
            const phoneMsg = messages.slice().reverse().find((m: any) => m._guidedHomePhoneServices);
            const phoneServices: HomePhoneService[] = (phoneMsg as any)?._guidedHomePhoneServices ?? [];
            const phone = phoneServices.find(s => s.id === flow.selectedHomePhoneId);
            if (phone) { phoneTotal = phone.monthlyPrice; phoneLine = `📞 Phone: ${phone.name}${phone.monthlyPrice > 0 ? ` — £${phone.monthlyPrice.toFixed(2)}/mo` : ' — Free'}`; }
        }

        const totalMonthly = plan.monthlyPrice + addonTotal + tvTotal + simTotal + phoneTotal;
        let summary = `📋 **Your Broadband Order Summary**\n\n`;
        summary += `🌐 Plan: ${plan.name}\n`;
        summary += `  ↓ ${plan.downloadSpeedMbps} Mbps / ↑ ${plan.uploadSpeedMbps} Mbps\n`;
        summary += `  📅 ${plan.contractLengthMonths} month contract\n`;
        summary += `  💰 £${plan.monthlyPrice.toFixed(2)}/mo\n`;
        if (addonLines.length > 0) {
            summary += `\n📦 Add-ons:\n${addonLines.join('\n')}\n`;
        }
        if (tvLine) summary += `\n${tvLine}\n`;
        if (simLine) summary += `\n${simLine}\n`;
        if (phoneLine) summary += `\n${phoneLine}\n`;
        summary += `\n💳 **Total: £${totalMonthly.toFixed(2)}/mo**`;

        addAiMessage(summary, { suggestedActions: ['Add to cart', 'Go back', 'Start over'] });
    }, [addAiMessage, messages]);

    const handleGoBack = useCallback(() => {
        const flow = guidedFlowRef.current;
        const currentIdx = STEP_ORDER.indexOf(flow.currentStep);
        if (currentIdx <= 0) {
            setGuidedFlow(INITIAL_GUIDED_FLOW_STATE);
            addAiMessage('Guided broadband flow cancelled. How else can I help?');
            return;
        }
        const prevStep = STEP_ORDER[currentIdx - 1];
        const updates: Partial<GuidedFlowState> = { currentStep: prevStep };
        if (prevStep === 'postcode') {
            updates.postcode = undefined; updates.selectedAddress = undefined;
            updates.preferences = undefined; updates.selectedPlan = undefined; updates.selectedAddons = undefined;
            updates.selectedTvPackageId = undefined; updates.selectedSimPlanId = undefined; updates.selectedHomePhoneId = undefined;
        } else if (prevStep === 'address') {
            updates.selectedAddress = undefined; updates.preferences = undefined;
            updates.selectedPlan = undefined; updates.selectedAddons = undefined;
            updates.selectedTvPackageId = undefined; updates.selectedSimPlanId = undefined; updates.selectedHomePhoneId = undefined;
        } else if (prevStep === 'preferences') {
            updates.preferences = undefined; updates.selectedPlan = undefined; updates.selectedAddons = undefined;
            updates.selectedTvPackageId = undefined; updates.selectedSimPlanId = undefined; updates.selectedHomePhoneId = undefined;
        } else if (prevStep === 'plan') {
            updates.selectedPlan = undefined; updates.selectedAddons = undefined;
            updates.selectedTvPackageId = undefined; updates.selectedSimPlanId = undefined; updates.selectedHomePhoneId = undefined;
        } else if (prevStep === 'addons') {
            updates.selectedAddons = [];
            updates.selectedTvPackageId = undefined; updates.selectedSimPlanId = undefined; updates.selectedHomePhoneId = undefined;
        } else if (prevStep === 'tv_packages') {
            updates.selectedTvPackageId = undefined; updates.selectedSimPlanId = undefined; updates.selectedHomePhoneId = undefined;
        } else if (prevStep === 'sim_plans') {
            updates.selectedSimPlanId = undefined; updates.selectedHomePhoneId = undefined;
        } else if (prevStep === 'home_phone') {
            updates.selectedHomePhoneId = undefined;
        }
        setGuidedFlow(prev => ({ ...prev, ...updates }));

        if (prevStep === 'postcode') {
            addAiMessage('Sure, let\'s go back. Please enter your postcode.', { suggestedActions: ['Cancel'] });
        } else if (prevStep === 'address') {
            addAiMessage('Going back to address selection. Please enter your postcode again.', { suggestedActions: ['Cancel'] });
            setGuidedFlow(prev => ({ ...prev, currentStep: 'postcode', postcode: undefined }));
        } else if (prevStep === 'preferences') {
            addAiMessage('Going back to preferences. What are you looking for in a broadband plan?', {
                suggestedActions: ['Fast speeds', 'Budget-friendly', 'Short contract', 'Show all plans'],
            });
        } else if (prevStep === 'plan') {
            addAiMessage('Going back to plan selection. Let me re-check available plans...');
            if (flow.selectedAddress && flow.preferences) {
                handlePreferencesStep(flow.preferences);
            } else if (flow.selectedAddress) {
                handlePreferencesStep({ speedTier: null, minSpeed: null, maxSpeed: null, minUploadSpeed: null, maxUploadSpeed: null, minBudget: null, maxBudget: null, maxContractMonths: null, minContractMonths: null, usageType: null, showAll: true });
            }
        } else if (prevStep === 'addons') {
            addAiMessage('Going back to add-ons selection.');
            if (flow.selectedPlan) handlePlanStep(flow.selectedPlan);
        } else if (prevStep === 'tv_packages') {
            addAiMessage('Going back to TV packages.');
            handleTvPackagesStep();
        } else if (prevStep === 'sim_plans') {
            addAiMessage('Going back to SIM plans.');
            handleSimPlansStep();
        } else if (prevStep === 'home_phone') {
            addAiMessage('Going back to home phone services.');
            handleHomePhoneStep();
        }
    }, [addAiMessage, handlePreferencesStep, handlePlanStep, handleTvPackagesStep, handleSimPlansStep, handleHomePhoneStep]);

    // ── Installation handlers ───────────────────────────────────────────

    const hasActiveBroadbandOrder = useCallback((): boolean => {
        return cart.some(item => item.item_type === 'broadband_service');
    }, [cart]);

    const handleInstallationQuery = useCallback(async (): Promise<boolean> => {
        if (!hasActiveBroadbandOrder()) {
            addAiMessage(
                'You need to complete a broadband purchase before scheduling an installation. Please select a broadband plan and add it to your cart first.',
                { suggestedActions: guidedFlowRef.current.active ? ['Go back', 'Cancel'] : ['Show me broadband plans'] }
            );
            return true;
        }
        addAiMessage('Let me check available installation slots...');
        try {
            const { apiClient } = await import('@/lib/api-client');
            const slots = await apiClient.getAvailableSlots();
            const available = slots.filter(s => s.available);
            if (available.length === 0) {
                setPendingSlots([]);
                addAiMessage('There are no available installation slots at the moment. Please try again later.', {
                    suggestedActions: guidedFlowRef.current.active ? ['Go back', 'Cancel'] : ['Try again'],
                });
                return true;
            }
            setPendingSlots(slots);
            const slotsMessage = formatAvailableSlots(slots);
            const chipLabels = available.slice(0, 4).map((_, i) => `${i + 1}`);
            addAiMessage(slotsMessage, { suggestedActions: [...chipLabels, ...(guidedFlowRef.current.active ? ['Go back'] : [])] });
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch installation slots';
            addAiMessage(`Sorry, there was an error fetching installation slots: ${msg}`, {
                suggestedActions: guidedFlowRef.current.active ? ['Try again', 'Go back', 'Cancel'] : ['Try again'],
            });
            return true;
        }
    }, [addAiMessage, hasActiveBroadbandOrder]);

    const handleSlotSelection = useCallback(async (date: string, slot: string, timeRange: string): Promise<boolean> => {
        addAiMessage(`Booking installation for ${date} — ${slot} (${timeRange})...`);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const broadbandItem = cart.find(item => item.item_type === 'broadband_service');
            const appointment = await apiClient.bookAppointment({
                sessionId: broadbandItem?.broadband_ref ?? '',
                preferredDate: date,
                preferredTimeSlot: slot,
                broadbandItemId: broadbandItem?.product.id,
            });
            setLastAppointmentId(appointment.appointmentId);
            setPendingSlots([]);
            addAiMessage(formatBookingConfirmation(appointment), {
                suggestedActions: guidedFlowRef.current.active ? ['Go back', 'Cancel'] : ['Check my installation'],
            });
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to book appointment';
            addAiMessage(`Sorry, that slot couldn't be booked: ${msg}. Please select an alternative slot.`, {
                suggestedActions: guidedFlowRef.current.active ? ['Try again', 'Go back', 'Cancel'] : ['Try again'],
            });
            return true;
        }
    }, [addAiMessage, cart]);

    const handleCheckAppointment = useCallback(async (): Promise<boolean> => {
        if (!lastAppointmentId) {
            addAiMessage('You don\'t have a booked installation appointment yet. Would you like to schedule one?', {
                suggestedActions: hasActiveBroadbandOrder() ? ['Book installation'] : ['Show me broadband plans'],
            });
            return true;
        }
        addAiMessage('Let me check your installation appointment...');
        try {
            const { apiClient } = await import('@/lib/api-client');
            const appointment = await apiClient.getAppointment(lastAppointmentId);
            addAiMessage(formatAppointmentDetails(appointment), {
                suggestedActions: guidedFlowRef.current.active ? ['Go back', 'Cancel'] : ['Book installation'],
            });
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch appointment details';
            addAiMessage(`Sorry, there was an error checking your appointment: ${msg}`, { suggestedActions: ['Try again'] });
            return true;
        }
    }, [addAiMessage, lastAppointmentId, hasActiveBroadbandOrder]);

    // ── AI communication ────────────────────────────────────────────────

    const sanitizeAiMessage = (message: string | undefined): string => {
        if (!message) return 'Sorry, something went wrong. Please try again.';
        if (message.includes('API Error:') || message.includes('RESOURCE_EXHAUSTED') || message.includes('exceeded your current quota')) {
            return "I'm getting a lot of requests right now. Please wait a few seconds and try again.";
        }
        if (message.includes('Network error:')) {
            return 'Sorry, the AI service is temporarily unavailable. Please try again in a moment.';
        }
        return message;
    };

    const buildGuidedFlowContext = useCallback((): string => {
        const flow = guidedFlowRef.current;
        if (!flow.active) return '';
        const stepDescriptions: Record<GuidedFlowStep, string> = {
            postcode: 'The user is in a broadband purchase journey and needs to enter their UK postcode first so we can check availability at their address.',
            address: `The user is selecting their address from a list (postcode: ${flow.postcode ?? 'unknown'}). They need to pick an address number before we can check plans.`,
            preferences: `The user has selected their address (${flow.selectedAddress?.formattedAddress ?? 'unknown'}). They can now tell us their broadband preferences (speed, budget, contract length) or ask to see all plans.`,
            plan: `We are showing broadband plans available at ${flow.selectedAddress?.formattedAddress ?? 'their address'}. The user needs to select a plan.`,
            addons: `The user selected the "${flow.selectedPlan?.name ?? 'unknown'}" plan (${flow.selectedPlan?.downloadSpeedMbps ?? '?'} Mbps, £${flow.selectedPlan?.monthlyPrice?.toFixed(2) ?? '?'}/mo). They are choosing optional add-ons. The next step is TV packages.\nIMPORTANT: If the user indicates they want to move on, skip, proceed, are done with add-ons, or don't want any more — respond with action "advance_step". Only keep them here if they are actively asking about or selecting add-ons.`,
            tv_packages: `The user is choosing an optional TV package to add to their broadband order. They can select one or skip. The next step is SIM plans.\nIMPORTANT: If the user indicates they want to skip, move on, don't want a TV package, or are done — respond with action "advance_step". Only keep them here if they are actively asking about or selecting a TV package.`,
            sim_plans: `The user is choosing an optional SIM plan to add to their broadband order. They can select one or skip. The next step is home phone services.\nIMPORTANT: If the user indicates they want to skip, move on, don't want a SIM plan, or are done — respond with action "advance_step". Only keep them here if they are actively asking about or selecting a SIM plan.`,
            home_phone: `The user is choosing an optional home phone service to add to their broadband order. They can select one or skip. The next step is the order summary.\nIMPORTANT: If the user indicates they want to skip, move on, don't want a home phone service, or are done — respond with action "advance_step". Only keep them here if they are actively asking about or selecting a home phone service.`,
            summary: `The user is reviewing their broadband order summary for "${flow.selectedPlan?.name ?? 'unknown'}" plan. They can add it to cart, go back, or start over.`,
        };
        return `\n\nBROADBAND GUIDED FLOW CONTEXT:\nCurrent step: ${flow.currentStep}\n${stepDescriptions[flow.currentStep]}\nRespond helpfully to the user's question while guiding them through the current step.`;
    }, []);

    const sendToAI = useCallback(async (text: string, extraContext?: string): Promise<boolean> => {
        const history = messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'ai', text: m.text }));
        const messageWithContext = extraContext ? `${text}\n\n[SYSTEM CONTEXT: ${extraContext}]` : text;
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: messageWithContext, history,
                cartItems: cart.map(i => ({ productId: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity })),
                appliedCouponCode: appliedCoupon?.promotionName ?? null,
                broadbandPlans: broadbandPlans.length > 0 ? broadbandPlans : undefined
            })
        });
        const data = await res.json();

        // Check if AI wants to advance the guided flow step
        const aiAction = (data.action ?? data.actions?.[0]?.action ?? '').toLowerCase();
        if (aiAction === 'advance_step') {
            // Show the AI's acknowledgment message before advancing
            if (data.message) {
                setMessages(prev => [...prev, { role: 'ai', text: sanitizeAiMessage(data.message) }]);
            }
            return true; // signal caller to advance
        }

        const flow = guidedFlowRef.current;
        const stripBroadbandSteps: GuidedFlowStep[] = ['postcode', 'address', 'plan'];
        let summaryCards = Array.isArray(data.summaryCards) ? data.summaryCards : undefined;
        if (flow.active && stripBroadbandSteps.includes(flow.currentStep)) {
            summaryCards = summaryCards?.filter((c: RawSummaryCard) => c.type !== 'broadband');
            if (summaryCards?.length === 0) summaryCards = undefined;
        }

        let suggestedActions = Array.isArray(data.suggestedActions) ? data.suggestedActions : [];
        if (flow.active) {
            const stepChips: Record<GuidedFlowStep, string[]> = {
                postcode: ['Cancel'],
                address: ['Go back', 'Cancel'],
                preferences: ['Fast speeds', 'Budget-friendly', 'Show all plans', 'Go back'],
                plan: ['Show all plans', 'Go back', 'Cancel'],
                addons: ['Show all add-ons', 'Continue', 'Go back'],
                tv_packages: ['Skip', 'Go back'],
                sim_plans: ['Skip', 'Go back'],
                home_phone: ['Skip', 'Go back'],
                summary: ['Add to cart', 'Go back', 'Start over'],
            };
            const flowChips = stepChips[flow.currentStep] ?? [];
            const merged = [...suggestedActions.filter((s: string) => !flowChips.some(fc => fc.toLowerCase() === s.toLowerCase())), ...flowChips];
            suggestedActions = merged.slice(0, 5);
        }

        setMessages(prev => [...prev, {
            role: 'ai', text: sanitizeAiMessage(data.message), comparison: data.comparison,
            summaryCards,
            suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
        }]);
        return false;
    }, [messages, cart, appliedCoupon, broadbandPlans]);

    // ── Guided flow message processor ───────────────────────────────────

    const processGuidedFlowMessage = useCallback(async (text: string): Promise<boolean> => {
        const flow = guidedFlowRef.current;
        if (!flow.active) return false;

        const lower = text.toLowerCase().trim();

        if (lower === 'cancel') {
            setGuidedFlow(INITIAL_GUIDED_FLOW_STATE);
            addAiMessage('Broadband flow cancelled. How else can I help?');
            return true;
        }
        if (lower === 'go back' || lower === 'back') { handleGoBack(); return true; }
        if (lower === 'start over') {
            setGuidedFlow({ ...INITIAL_GUIDED_FLOW_STATE, active: true, currentStep: 'postcode' });
            addAiMessage('Let\'s start fresh! Please enter your postcode.', { suggestedActions: ['Cancel'] });
            return true;
        }

        // Installation queries at any step
        if (pendingSlots.length > 0) {
            const slotSelection = parseSlotSelection(text, pendingSlots);
            if (slotSelection) { await handleSlotSelection(slotSelection.date, slotSelection.slot, slotSelection.timeRange); return true; }
        }
        if (isCheckAppointmentQuery(lower)) { await handleCheckAppointment(); return true; }
        if (isInstallationQuery(lower)) { await handleInstallationQuery(); return true; }

        // Step-specific handling
        if (flow.currentStep === 'postcode') {
            if (UK_POSTCODE_REGEX.test(text.trim())) { await handlePostcodeStep(text.trim()); return true; }
            await sendToAI(text, buildGuidedFlowContext() + '\nCRITICAL: The user has NOT provided a valid UK postcode yet. Do NOT show or recommend any broadband plans. Do NOT include summaryCards. Answer their question helpfully but always remind them to enter a valid UK postcode (e.g. "SW1A 1AA") to check availability. Keep the response brief.');
            return true;
        }

        if (flow.currentStep === 'address') {
            const num = parseInt(text.trim(), 10);
            const addrMsg = messages.slice().reverse().find((m: any) => m._guidedAddresses);
            const addresses: BroadbandAddress[] = (addrMsg as any)?._guidedAddresses ?? [];
            if (!isNaN(num) && num >= 1 && num <= addresses.length) { await handleAddressStep(addresses[num - 1]); return true; }
            const matchedAddr = addresses.find(a => a.formattedAddress.toLowerCase().includes(lower));
            if (matchedAddr) { await handleAddressStep(matchedAddr); return true; }
            await sendToAI(text, buildGuidedFlowContext());
            return true;
        }

        if (flow.currentStep === 'preferences') {
            const preferences = parsePreferences(text);
            const hasFilters = preferences.showAll || preferences.speedTier !== null || preferences.minSpeed !== null || preferences.maxSpeed !== null || preferences.minUploadSpeed !== null || preferences.maxUploadSpeed !== null || preferences.minBudget !== null || preferences.maxBudget !== null || preferences.maxContractMonths !== null || preferences.minContractMonths !== null || preferences.usageType !== null;
            if (hasFilters) { await handlePreferencesStep(preferences); return true; }
            await sendToAI(text, buildGuidedFlowContext());
            return true;
        }

        if (flow.currentStep === 'plan') {
            if (lower.includes('show all plans') || lower.includes('show all available')) {
                const showAllFilter: PreferenceFilter = { speedTier: null, minSpeed: null, maxSpeed: null, minUploadSpeed: null, maxUploadSpeed: null, minBudget: null, maxBudget: null, maxContractMonths: null, minContractMonths: null, usageType: null, showAll: true };
                await handlePreferencesStep(showAllFilter);
                return true;
            }
            if (isPlanFeatureQuery(lower)) {
                const plansMsg = messages.slice().reverse().find((m: any) => m._guidedPlans);
                const displayedPlans: BroadbandPlan[] = (plansMsg as any)?._guidedPlans ?? [];
                if (displayedPlans.length === 0) {
                    addAiMessage('No plans are currently displayed. Please select your preferences first so I can show you available plans.', {
                        suggestedActions: ['Show all plans', 'Go back', 'Cancel'],
                    });
                } else {
                    const detailsText = displayedPlans.map(p => formatPlanDetails(p)).join('\n\n');
                    addAiMessage(`Here are the details for the ${displayedPlans.length} plan(s) shown:\n\n${detailsText}`, {
                        suggestedActions: ['Show all plans', 'Go back', 'Cancel'],
                    });
                }
                return true;
            }
            // Try to match a plan by name from the displayed plans
            const plansMsg = messages.slice().reverse().find((m: any) => m._guidedPlans);
            const displayedPlans: BroadbandPlan[] = (plansMsg as any)?._guidedPlans ?? [];
            if (displayedPlans.length > 0) {
                const matchedPlan = displayedPlans.find(p => lower.includes(p.name.toLowerCase()));
                if (matchedPlan) {
                    await handlePlanStep(matchedPlan);
                    return true;
                }
            }
            // Detect user intent to select/add a plan (e.g. "ok add it", "add that", "yes", "select it")
            const selectIntentPattern = /^(ok\s*)?(add|select|choose|pick|get|go with|take|yes|yep|yeah|sure|ok|okay|that one|the one you recommended|add it|select it|i('?ll| will) (take|go with|have|get)|sounds good|let'?s go|go ahead)/i;
            if (selectIntentPattern.test(lower) && displayedPlans.length > 0) {
                // Try to find the plan the AI most recently recommended by scanning the last AI message
                const lastAiMsg = messages.slice().reverse().find(m => m.role === 'ai');
                const lastAiText = lastAiMsg?.text?.toLowerCase() ?? '';
                const recommendedPlan = displayedPlans.find(p => lastAiText.includes(p.name.toLowerCase()));
                if (recommendedPlan) {
                    await handlePlanStep(recommendedPlan);
                    return true;
                }
                // AI didn't recommend a specific plan — let AI ask the user which one they want
                await sendToAI(text, buildGuidedFlowContext() + `\nThe user wants to select a plan but hasn't specified which one. Here are the available plans: ${displayedPlans.map(p => `${p.name} (${p.downloadSpeedMbps}Mbps, £${p.monthlyPrice.toFixed(2)}/mo, ${p.contractLengthMonths}mo contract)`).join('; ')}. Ask them which plan they'd like to go with. Do NOT include broadband summaryCards.`);
                return true;
            }
            // Detect recommendation request (e.g. "which one do you recommend", "what's the best plan")
            const recommendPattern = /\b(recommend|suggest|best|which one|what should|what do you think|your pick|your choice)\b/i;
            if (recommendPattern.test(lower) && displayedPlans.length > 0) {
                await sendToAI(text, buildGuidedFlowContext() + `\nThe user is asking for a recommendation. Here are the available plans: ${displayedPlans.map(p => `${p.name} (${p.downloadSpeedMbps}Mbps, £${p.monthlyPrice.toFixed(2)}/mo, ${p.contractLengthMonths}mo contract)`).join('; ')}. Recommend the best value plan and explain why. Do NOT include broadband summaryCards.`);
                return true;
            }
            // Not a plan name or selection intent — send to AI
            await sendToAI(text, buildGuidedFlowContext() + '\nCRITICAL: If the user is asking to add or select a broadband plan, respond with the plan name they likely want based on the conversation. Do NOT include broadband summaryCards. Answer their question helpfully and guide them to select a plan.');
            return true;
        }

        if (flow.currentStep === 'addons') {
            // Direct advance: "continue", "skip", "next", "done", "no thanks", "move on", "proceed"
            if (/^(continue|skip|next|done|no thanks|no|nope|move on|proceed|i'?m good|that'?s it|that'?s all)$/i.test(lower)) {
                await handleTvPackagesStep();
                return true;
            }
            if (lower.includes('show all add-ons') || lower.includes('show all addons')) {
                const showAllFilter: PreferenceFilter = { speedTier: null, minSpeed: null, maxSpeed: null, minUploadSpeed: null, maxUploadSpeed: null, minBudget: null, maxBudget: null, maxContractMonths: null, minContractMonths: null, usageType: null, showAll: true };
                await fetchAndDisplayAddons(showAllFilter);
                return true;
            }
            const addonsMsg = messages.slice().reverse().find((m: any) => m._guidedAddons);
            const allAddons: BroadbandAddon[] = (addonsMsg as any)?._guidedAddons ?? [];
            if (allAddons.length === 0) {
                const addonPreferences = parsePreferences(text);
                await fetchAndDisplayAddons(addonPreferences);
                return true;
            }

            // Number-based selection: "add 1 2 4", "1, 3, 5", "add 1 and 3", etc.
            const numbers = text.match(/\d+/g);
            if (numbers && numbers.length > 0) {
                const indices = numbers.map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= allAddons.length);
                if (indices.length > 0) {
                    const currentAddons = flow.selectedAddons ?? [];
                    const newAddons = [...currentAddons];
                    const addedNames: string[] = [];
                    const alreadyAdded: string[] = [];
                    for (const idx of indices) {
                        const addon = allAddons[idx - 1];
                        if (currentAddons.includes(addon.id)) {
                            alreadyAdded.push(addon.name);
                        } else if (!newAddons.includes(addon.id)) {
                            newAddons.push(addon.id);
                            addedNames.push(`${addon.name} (£${addon.monthlyPrice.toFixed(2)}/mo)`);
                        }
                    }
                    if (addedNames.length > 0) {
                        setGuidedFlow(prev => ({ ...prev, selectedAddons: newAddons }));
                        let msg = `Added ${addedNames.join(', ')}.`;
                        if (alreadyAdded.length > 0) msg += ` ${alreadyAdded.join(', ')} was already added.`;
                        msg += ' You can add more or continue.';
                        addAiMessage(msg, {
                            suggestedActions: [
                                ...allAddons.filter(a => !newAddons.includes(a.id)).slice(0, 2).map(a => `Add ${a.name} (£${a.monthlyPrice.toFixed(2)}/mo)`),
                                'Continue',
                            ],
                        });
                    } else if (alreadyAdded.length > 0) {
                        addAiMessage(`${alreadyAdded.join(', ')} already added.`, { suggestedActions: ['Continue', 'Go back'] });
                    }
                    return true;
                }
            }

            // Name-based matching
            const matchedAddon = allAddons.find(a =>
                lower.includes(a.name.toLowerCase()) || lower === `add ${a.name.toLowerCase()} (£${a.monthlyPrice.toFixed(2)}/mo)`
            );
            if (matchedAddon) {
                const currentAddons = flow.selectedAddons ?? [];
                if (currentAddons.includes(matchedAddon.id)) {
                    addAiMessage(`${matchedAddon.name} is already added.`, { suggestedActions: ['Continue', 'Go back'] });
                } else {
                    const newAddons = [...currentAddons, matchedAddon.id];
                    setGuidedFlow(prev => ({ ...prev, selectedAddons: newAddons }));
                    addAiMessage(`Added ${matchedAddon.name} (£${matchedAddon.monthlyPrice.toFixed(2)}/mo). You can add more or continue.`, {
                        suggestedActions: [
                            ...allAddons.filter(a => !newAddons.includes(a.id)).slice(0, 2).map(a => `Add ${a.name} (£${a.monthlyPrice.toFixed(2)}/mo)`),
                            'Continue',
                        ],
                    });
                }
                return true;
            }
            if (lower === 'try again' && flow.selectedPlan) {
                const showAllFilter: PreferenceFilter = { speedTier: null, minSpeed: null, maxSpeed: null, minUploadSpeed: null, maxUploadSpeed: null, minBudget: null, maxBudget: null, maxContractMonths: null, minContractMonths: null, usageType: null, showAll: true };
                await fetchAndDisplayAddons(showAllFilter);
                return true;
            }
            const shouldAdvance = await sendToAI(text, buildGuidedFlowContext());
            if (shouldAdvance) await handleTvPackagesStep();
            return true;
        }

        if (flow.currentStep === 'tv_packages') {
            // Direct advance
            if (/^(continue|skip|next|done|no thanks|no|nope|move on|proceed|i'?m good|that'?s it|that'?s all)$/i.test(lower)) {
                await handleSimPlansStep();
                return true;
            }
            // Number-based selection
            const tvMsg = messages.slice().reverse().find((m: any) => m._guidedTvPackages);
            const tvPackages: TvPackage[] = (tvMsg as any)?._guidedTvPackages ?? [];
            const num = parseInt(text.trim(), 10);
            if (!isNaN(num) && num >= 1 && num <= tvPackages.length) {
                const selected = tvPackages[num - 1];
                setGuidedFlow(prev => ({ ...prev, selectedTvPackageId: selected.id }));
                addAiMessage(`Selected ${selected.name}${selected.monthlyPrice > 0 ? ` (£${selected.monthlyPrice.toFixed(2)}/mo)` : ' (Free)'}. Moving on to SIM plans...`);
                await handleSimPlansStep();
                return true;
            }
            // Name-based matching
            const matchedTv = tvPackages.find(p => lower.includes(p.name.toLowerCase()));
            if (matchedTv) {
                setGuidedFlow(prev => ({ ...prev, selectedTvPackageId: matchedTv.id }));
                addAiMessage(`Selected ${matchedTv.name}${matchedTv.monthlyPrice > 0 ? ` (£${matchedTv.monthlyPrice.toFixed(2)}/mo)` : ' (Free)'}. Moving on to SIM plans...`);
                await handleSimPlansStep();
                return true;
            }
            const shouldAdvanceTv = await sendToAI(text, buildGuidedFlowContext());
            if (shouldAdvanceTv) await handleSimPlansStep();
            return true;
        }

        if (flow.currentStep === 'sim_plans') {
            // Direct advance
            if (/^(continue|skip|next|done|no thanks|no|nope|move on|proceed|i'?m good|that'?s it|that'?s all)$/i.test(lower)) {
                await handleHomePhoneStep();
                return true;
            }
            const simMsg = messages.slice().reverse().find((m: any) => m._guidedSimPlans);
            const simPlans: SimPlan[] = (simMsg as any)?._guidedSimPlans ?? [];
            const num = parseInt(text.trim(), 10);
            if (!isNaN(num) && num >= 1 && num <= simPlans.length) {
                const selected = simPlans[num - 1];
                setGuidedFlow(prev => ({ ...prev, selectedSimPlanId: selected.id }));
                addAiMessage(`Selected ${selected.name} (£${selected.monthlyPrice.toFixed(2)}/mo). Moving on to home phone services...`);
                await handleHomePhoneStep();
                return true;
            }
            const matchedSim = simPlans.find(p => lower.includes(p.name.toLowerCase()));
            if (matchedSim) {
                setGuidedFlow(prev => ({ ...prev, selectedSimPlanId: matchedSim.id }));
                addAiMessage(`Selected ${matchedSim.name} (£${matchedSim.monthlyPrice.toFixed(2)}/mo). Moving on to home phone services...`);
                await handleHomePhoneStep();
                return true;
            }
            const shouldAdvanceSim = await sendToAI(text, buildGuidedFlowContext());
            if (shouldAdvanceSim) await handleHomePhoneStep();
            return true;
        }

        if (flow.currentStep === 'home_phone') {
            // Direct advance
            if (/^(continue|skip|next|done|no thanks|no|nope|move on|proceed|i'?m good|that'?s it|that'?s all)$/i.test(lower)) {
                handleSummaryStep();
                return true;
            }
            const phoneMsg = messages.slice().reverse().find((m: any) => m._guidedHomePhoneServices);
            const phoneServices: HomePhoneService[] = (phoneMsg as any)?._guidedHomePhoneServices ?? [];
            const num = parseInt(text.trim(), 10);
            if (!isNaN(num) && num >= 1 && num <= phoneServices.length) {
                const selected = phoneServices[num - 1];
                setGuidedFlow(prev => ({ ...prev, selectedHomePhoneId: selected.id }));
                addAiMessage(`Selected ${selected.name}${selected.monthlyPrice > 0 ? ` (£${selected.monthlyPrice.toFixed(2)}/mo)` : ' (Free)'}. Let's see your summary!`);
                handleSummaryStep();
                return true;
            }
            const matchedPhone = phoneServices.find(s => lower.includes(s.name.toLowerCase()));
            if (matchedPhone) {
                setGuidedFlow(prev => ({ ...prev, selectedHomePhoneId: matchedPhone.id }));
                addAiMessage(`Selected ${matchedPhone.name}${matchedPhone.monthlyPrice > 0 ? ` (£${matchedPhone.monthlyPrice.toFixed(2)}/mo)` : ' (Free)'}. Let's see your summary!`);
                handleSummaryStep();
                return true;
            }
            const shouldAdvancePhone = await sendToAI(text, buildGuidedFlowContext());
            if (shouldAdvancePhone) handleSummaryStep();
            return true;
        }

        if (flow.currentStep === 'summary') {
            if (lower === 'add to cart' && flow.selectedPlan) {
                const plan = flow.selectedPlan;
                const addonIds = flow.selectedAddons ?? [];
                let addonTotal = 0;
                const extras: string[] = [];

                // Resolve add-ons
                const lastAddonsMsg = messages.slice().reverse().find((m: any) => m._guidedAddons);
                const allAddons: BroadbandAddon[] = (lastAddonsMsg as any)?._guidedAddons ?? [];
                for (const id of addonIds) {
                    const addon = allAddons.find(a => a.id === id || `Add ${a.name} (£${a.monthlyPrice.toFixed(2)}/mo)` === id);
                    if (addon) { addonTotal += addon.monthlyPrice; extras.push(`${addon.name} £${addon.monthlyPrice.toFixed(2)}/mo`); }
                }

                // Resolve TV package
                let tvTotal = 0;
                if (flow.selectedTvPackageId) {
                    const tvMsg = messages.slice().reverse().find((m: any) => m._guidedTvPackages);
                    const tvPkgs: TvPackage[] = (tvMsg as any)?._guidedTvPackages ?? [];
                    const tv = tvPkgs.find(p => p.id === flow.selectedTvPackageId);
                    if (tv) { tvTotal = tv.monthlyPrice; extras.push(`TV: ${tv.name}${tv.monthlyPrice > 0 ? ` £${tv.monthlyPrice.toFixed(2)}/mo` : ''}`); }
                }

                // Resolve SIM plan
                let simTotal = 0;
                if (flow.selectedSimPlanId) {
                    const simMsg = messages.slice().reverse().find((m: any) => m._guidedSimPlans);
                    const simPlans: SimPlan[] = (simMsg as any)?._guidedSimPlans ?? [];
                    const sim = simPlans.find(p => p.id === flow.selectedSimPlanId);
                    if (sim) { simTotal = sim.monthlyPrice; extras.push(`SIM: ${sim.name} £${sim.monthlyPrice.toFixed(2)}/mo`); }
                }

                // Resolve home phone
                let phoneTotal = 0;
                if (flow.selectedHomePhoneId) {
                    const phoneMsg = messages.slice().reverse().find((m: any) => m._guidedHomePhoneServices);
                    const phoneServices: HomePhoneService[] = (phoneMsg as any)?._guidedHomePhoneServices ?? [];
                    const phone = phoneServices.find(s => s.id === flow.selectedHomePhoneId);
                    if (phone) { phoneTotal = phone.monthlyPrice; extras.push(`Phone: ${phone.name}${phone.monthlyPrice > 0 ? ` £${phone.monthlyPrice.toFixed(2)}/mo` : ''}`); }
                }

                const totalMonthly = plan.monthlyPrice + addonTotal + tvTotal + simTotal + phoneTotal;
                const summaryParts = [`${plan.downloadSpeedMbps}Mbps / ${plan.uploadSpeedMbps}Mbps · ${plan.contractLengthMonths}mo`];
                if (extras.length > 0) summaryParts.push(extras.join(' · '));
                summaryParts.push(`£${totalMonthly.toFixed(2)}/mo`);

                await addBroadbandServiceToCart(plan, plan.planId, summaryParts.join(' · '), totalMonthly);
                addAiMessage('Your broadband bundle has been added to the cart! Is there anything else I can help with?');
                setGuidedFlow(INITIAL_GUIDED_FLOW_STATE);
                return true;
            }
            if (lower === 'start over') {
                setGuidedFlow({ ...INITIAL_GUIDED_FLOW_STATE, active: true, currentStep: 'postcode' });
                addAiMessage('Let\'s start fresh! Please enter your postcode.', { suggestedActions: ['Cancel'] });
                return true;
            }
            if (isPlanFeatureQuery(lower)) {
                if (flow.selectedPlan) {
                    addAiMessage(formatPlanDetails(flow.selectedPlan), { suggestedActions: ['Add to cart', 'Go back', 'Start over'] });
                } else {
                    addAiMessage('No plan is currently selected. Please go back and select a plan first.', { suggestedActions: ['Go back', 'Start over'] });
                }
                return true;
            }
            await sendToAI(text, buildGuidedFlowContext());
            return true;
        }

        return false;
    }, [addAiMessage, handlePostcodeStep, handleAddressStep, handlePreferencesStep, handlePlanStep, handleSummaryStep, handleGoBack, fetchAndDisplayAddons, handleTvPackagesStep, handleSimPlansStep, handleHomePhoneStep, messages, addBroadbandServiceToCart, pendingSlots, handleSlotSelection, handleCheckAppointment, handleInstallationQuery, sendToAI, buildGuidedFlowContext]);

    const handleGuidedPlanSelect = useCallback(async (planId: string) => {
        const flow = guidedFlowRef.current;
        if (!flow.active || flow.currentStep !== 'plan') return false;
        const plansMsg = messages.slice().reverse().find((m: any) => m._guidedPlans);
        const plans: BroadbandPlan[] = (plansMsg as any)?._guidedPlans ?? [];
        const plan = plans.find(p => p.planId === planId);
        if (plan) { await handlePlanStep(plan); return true; }
        return false;
    }, [messages, handlePlanStep]);

    // ── Card action handler ─────────────────────────────────────────────

    const handleCardAction = useCallback(async (actionType: string, id: string) => {
        if (actionType === 'add_to_cart') {
            const { apiClient } = await import('@/lib/api-client');
            const all = await apiClient.getProducts();
            const p = all.find((p: Product) => String(p.id) === String(id));
            if (p) addToCart(p);
        } else if (actionType === 'add_broadband_to_cart') {
            if (guidedFlowRef.current.active && guidedFlowRef.current.currentStep === 'plan') {
                const handled = await handleGuidedPlanSelect(id);
                if (handled) return;
                const cardMsg = messages.slice().reverse().find(m =>
                    m.summaryCards?.some(c => c.id === id && c.type === 'broadband')
                );
                const card = cardMsg?.summaryCards?.find(c => c.id === id && c.type === 'broadband');
                if (card) {
                    const plan: BroadbandPlan = {
                        planId: card.id, name: card.name,
                        downloadSpeedMbps: parseInt(card.downloadSpeed ?? '0'),
                        uploadSpeedMbps: parseInt(card.uploadSpeed ?? '0'),
                        monthlyPrice: card.monthlyPrice ?? 0,
                        contractLengthMonths: parseInt(card.contractLength ?? '0'),
                        planType: 'broadband', technologyType: 'Fibre',
                        promotionalLabel: card.promotionalLabel ?? undefined,
                        includesRouter: false, activationFee: 0,
                    };
                    await handlePlanStep(plan);
                }
                return;
            }
            if (guidedFlowRef.current.active) {
                const stepMessages: Record<GuidedFlowStep, string> = {
                    postcode: 'Please enter your postcode first so I can verify this plan is available at your address.',
                    address: 'Please select your address first before choosing a plan.',
                    preferences: 'Let me know your preferences first, or say "Show all plans" to see what\'s available at your address.',
                    plan: 'Please select a plan from the verified options above.',
                    addons: 'You\'ve already selected a plan. Would you like to add any add-ons or continue?',
                    tv_packages: 'You\'re currently choosing a TV package. Please select one or skip.',
                    sim_plans: 'You\'re currently choosing a SIM plan. Please select one or skip.',
                    home_phone: 'You\'re currently choosing a home phone service. Please select one or skip.',
                    summary: 'You\'re almost done! Would you like to add this plan to your cart?',
                };
                addAiMessage(stepMessages[guidedFlowRef.current.currentStep], { suggestedActions: ['Cancel'] });
                return;
            }
            const cardMsg = messages.slice().reverse().find(m =>
                m.summaryCards?.some(c => c.id === id && c.type === 'broadband')
            );
            const card = cardMsg?.summaryCards?.find(c => c.id === id && c.type === 'broadband');
            const planName = card?.name ?? 'this plan';
            addAiMessage(
                `Great choice with ${planName}! To complete your broadband order, I'll need to verify availability at your address first. Let's get started — please enter your postcode.`,
                { suggestedActions: ['Cancel'] }
            );
            setGuidedFlow({ ...INITIAL_GUIDED_FLOW_STATE, active: true, currentStep: 'postcode' });
        } else if (actionType === 'add_addon') {
            // Handle add-on card click
            const flow = guidedFlowRef.current;
            if (!flow.active || flow.currentStep !== 'addons') return;
            const addonsMsg = messages.slice().reverse().find((m: any) => m._guidedAddons);
            const allAddons: BroadbandAddon[] = (addonsMsg as any)?._guidedAddons ?? [];
            const addon = allAddons.find(a => a.id === id);
            if (!addon) return;
            const currentAddons = flow.selectedAddons ?? [];
            if (currentAddons.includes(addon.id)) {
                addAiMessage(`${addon.name} is already added.`, { suggestedActions: ['Continue', 'Go back'] });
            } else {
                const newAddons = [...currentAddons, addon.id];
                setGuidedFlow(prev => ({ ...prev, selectedAddons: newAddons }));
                addAiMessage(`Added ${addon.name} (£${addon.monthlyPrice.toFixed(2)}/mo). You can add more or continue.`, {
                    suggestedActions: [
                        ...allAddons.filter(a => !newAddons.includes(a.id)).slice(0, 2).map(a => `Add ${a.name} (£${a.monthlyPrice.toFixed(2)}/mo)`),
                        'Continue',
                    ],
                });
            }
        } else if (actionType === 'select_tv_package') {
            const flow = guidedFlowRef.current;
            if (!flow.active || flow.currentStep !== 'tv_packages') return;
            const tvMsg = messages.slice().reverse().find((m: any) => m._guidedTvPackages);
            const tvPackages: TvPackage[] = (tvMsg as any)?._guidedTvPackages ?? [];
            const selected = tvPackages.find(p => p.id === id);
            if (!selected) return;
            setGuidedFlow(prev => ({ ...prev, selectedTvPackageId: selected.id }));
            addAiMessage(`Selected ${selected.name}${selected.monthlyPrice > 0 ? ` (£${selected.monthlyPrice.toFixed(2)}/mo)` : ' (Free)'}. Moving on to SIM plans...`);
            await handleSimPlansStep();
        } else if (actionType === 'select_sim_plan') {
            const flow = guidedFlowRef.current;
            if (!flow.active || flow.currentStep !== 'sim_plans') return;
            const simMsg = messages.slice().reverse().find((m: any) => m._guidedSimPlans);
            const simPlans: SimPlan[] = (simMsg as any)?._guidedSimPlans ?? [];
            const selected = simPlans.find(p => p.id === id);
            if (!selected) return;
            setGuidedFlow(prev => ({ ...prev, selectedSimPlanId: selected.id }));
            addAiMessage(`Selected ${selected.name} (£${selected.monthlyPrice.toFixed(2)}/mo). Moving on to home phone services...`);
            await handleHomePhoneStep();
        } else if (actionType === 'select_home_phone') {
            const flow = guidedFlowRef.current;
            if (!flow.active || flow.currentStep !== 'home_phone') return;
            const phoneMsg = messages.slice().reverse().find((m: any) => m._guidedHomePhoneServices);
            const phoneServices: HomePhoneService[] = (phoneMsg as any)?._guidedHomePhoneServices ?? [];
            const selected = phoneServices.find(s => s.id === id);
            if (!selected) return;
            setGuidedFlow(prev => ({ ...prev, selectedHomePhoneId: selected.id }));
            addAiMessage(`Selected ${selected.name}${selected.monthlyPrice > 0 ? ` (£${selected.monthlyPrice.toFixed(2)}/mo)` : ' (Free)'}. Let's see your summary!`);
            handleSummaryStep();
        }
    }, [addToCart, addAiMessage, handleGuidedPlanSelect, handlePlanStep, handleSimPlansStep, handleHomePhoneStep, handleSummaryStep, messages]);

    // ── Main send handler ───────────────────────────────────────────────

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;
        setShowQuickActions(false);
        setMessages(prev => [...prev, { role: 'user', text }]);

        if (guidedFlowRef.current.active) {
            setIsTyping(true);
            try {
                const handled = await processGuidedFlowMessage(text);
                if (handled) return;
            } finally {
                setIsTyping(false);
            }
        }

        if (!guidedFlowRef.current.active && isGuidedFlowTrigger(text)) {
            startGuidedFlow(text);
            return;
        }

        if (!guidedFlowRef.current.active) {
            const lower = text.toLowerCase().trim();
            if (pendingSlots.length > 0) {
                const slotSelection = parseSlotSelection(text, pendingSlots);
                if (slotSelection) {
                    setIsTyping(true);
                    try { await handleSlotSelection(slotSelection.date, slotSelection.slot, slotSelection.timeRange); } finally { setIsTyping(false); }
                    return;
                }
            }
            if (isCheckAppointmentQuery(lower)) {
                setIsTyping(true);
                try { await handleCheckAppointment(); } finally { setIsTyping(false); }
                return;
            }
            if (isInstallationQuery(lower)) {
                setIsTyping(true);
                try { await handleInstallationQuery(); } finally { setIsTyping(false); }
                return;
            }
        }

        setIsTyping(true);
        try {
            const history = messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'ai', text: m.text }));
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text, history,
                    cartItems: cart.map(i => ({ productId: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity })),
                    appliedCouponCode: appliedCoupon?.promotionName ?? null,
                    broadbandPlans: broadbandPlans.length > 0 ? broadbandPlans : undefined
                })
            });
            const data = await res.json();

            const actionList: { action: string; payload?: any }[] = Array.isArray(data.actions)
                ? data.actions.map((a: any) => ({ ...a, action: a.action?.toLowerCase() }))
                : data.action && data.action.toLowerCase() !== 'none'
                    ? [{ action: data.action.toLowerCase(), payload: data.payload }]
                    : [];

            for (const act of actionList) {
                if (act.action === 'navigate') {
                    router.push(act.payload);
                } else if (act.action === 'add_to_cart') {
                    const { apiClient } = await import('@/lib/api-client');
                    const all = await apiClient.getProducts();
                    const ids = Array.isArray(act.payload) ? act.payload : [act.payload];
                    for (const pid of ids) {
                        const p = all.find((p: Product) => String(p.id) === String(pid));
                        if (p) addToCart(p);
                    }
                } else if (act.action === 'clear_cart') {
                    clearCart();
                } else if (act.action === 'update_quantity') {
                    updateQuantity(act.payload.productId, act.payload.quantity);
                } else if (act.action === 'set_all_quantities') {
                    cart.forEach(item => updateQuantity(item.product.id, act.payload.quantity));
                } else if (act.action === 'remove_from_cart') {
                    removeFromCart(act.payload);
                } else if (act.action === 'autofill_checkout') {
                    window.dispatchEvent(new CustomEvent('autofill-checkout', { detail: act.payload || {} }));
                    setTimeout(() => router.push('/checkout'), 100);
                } else if (act.action === 'apply_coupon' && act.payload?.code) {
                    try {
                        await applyCoupon(act.payload.code);
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Failed to apply coupon';
                        setMessages(prev => [...prev, { role: 'ai', text: `Couldn't apply that code: ${msg}` }]);
                        setIsTyping(false);
                        return;
                    }
                } else if (act.action === 'remove_coupon') {
                    removeCoupon();
                } else if (act.action === 'add_broadband_to_cart') {
                    const planId = String(act.payload);
                    const plan = broadbandPlans.find(p => p.planId === planId);
                    if (plan) await addBroadbandServiceToCart(plan, planId);
                }
            }

            setMessages(prev => [...prev, {
                role: 'ai', text: sanitizeAiMessage(data.message), comparison: data.comparison,
                summaryCards: Array.isArray(data.summaryCards) ? data.summaryCards : undefined,
                suggestedActions: Array.isArray(data.suggestedActions) ? data.suggestedActions : undefined,
            }]);
        } catch {
            setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, something went wrong.' }]);
        } finally {
            setIsTyping(false);
        }
    }, [processGuidedFlowMessage, startGuidedFlow, pendingSlots, handleSlotSelection, handleCheckAppointment, handleInstallationQuery, messages, cart, appliedCoupon, broadbandPlans, router, addToCart, clearCart, updateQuantity, removeFromCart, applyCoupon, removeCoupon, addBroadbandServiceToCart]);

    return {
        messages, isTyping, showQuickActions, messagesEndRef, cart,
        sendMessage, handleCardAction,
    };
}
