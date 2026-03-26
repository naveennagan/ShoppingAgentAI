'use client';

import { useReducer, useEffect, useCallback, useRef } from 'react';
import type { JourneyState, JourneyAction } from '@/types/broadband';
import StepProgressBar from './StepProgressBar';
import StepCard from './StepCard';
import PostcodeInput from './PostcodeInput';
import AddressSelector from './AddressSelector';
import DealBrowser from './DealBrowser';
import AddonPicker from './AddonPicker';
import TvPicker from './TvPicker';
import SimPicker from './SimPicker';
import PhoneServicePicker from './PhoneServicePicker';
import PricingSummary from './PricingSummary';

const STORAGE_KEY = 'broadband-journey-state';

const STEP_NAMES = [
  'Postcode',
  'Address',
  'Choose Plan',
  'Add-ons',
  'TV Package',
  'SIM Plan',
  'Home Phone',
  'Summary',
];

const initialState: JourneyState = {
  currentStep: 0,
  postcode: null,
  addresses: [],
  selectedAddress: null,
  plans: [],
  selectedPlan: null,
  addonsList: [],
  selectedAddons: [],
  tvPackages: [],
  selectedTvPackage: null,
  simPlans: [],
  selectedSimPlan: null,
  homePhoneServices: [],
  selectedHomePhoneService: null,
  loading: false,
  error: null,
};

function resetFromStep(state: JourneyState, step: number): Partial<JourneyState> {
  const resets: Partial<JourneyState> = { currentStep: step };
  // Clear selections for all steps after `step`
  if (step <= 0) {
    resets.addresses = [];
    resets.selectedAddress = null;
  }
  if (step <= 1) {
    resets.plans = [];
    resets.selectedPlan = null;
  }
  if (step <= 2) {
    resets.addonsList = [];
    resets.selectedAddons = [];
  }
  if (step <= 3) {
    resets.tvPackages = [];
    resets.selectedTvPackage = null;
  }
  if (step <= 4) {
    resets.simPlans = [];
    resets.selectedSimPlan = null;
  }
  if (step <= 5) {
    resets.homePhoneServices = [];
    resets.selectedHomePhoneService = null;
  }
  return resets;
}

function journeyReducer(state: JourneyState, action: JourneyAction): JourneyState {
  switch (action.type) {
    case 'SET_POSTCODE':
      return { ...state, postcode: action.payload, error: null };
    case 'SET_ADDRESSES':
      return { ...state, addresses: action.payload, loading: false, error: null };
    case 'SELECT_ADDRESS':
      return { ...state, selectedAddress: action.payload, error: null };
    case 'SET_PLANS':
      return { ...state, plans: action.payload, loading: false, error: null };
    case 'SELECT_PLAN':
      return { ...state, selectedPlan: action.payload, error: null };
    case 'SET_ADDONS_LIST':
      return { ...state, addonsList: action.payload, loading: false, error: null };
    case 'TOGGLE_ADDON': {
      const exists = state.selectedAddons.some(a => a.id === action.payload.id);
      const selectedAddons = exists
        ? state.selectedAddons.filter(a => a.id !== action.payload.id)
        : [...state.selectedAddons, action.payload];
      return { ...state, selectedAddons };
    }
    case 'SET_TV_PACKAGES':
      return { ...state, tvPackages: action.payload, loading: false, error: null };
    case 'SELECT_TV_PACKAGE':
      return { ...state, selectedTvPackage: action.payload, error: null };
    case 'SET_SIM_PLANS':
      return { ...state, simPlans: action.payload, loading: false, error: null };
    case 'SELECT_SIM_PLAN':
      return { ...state, selectedSimPlan: action.payload, error: null };
    case 'SET_HOME_PHONE_SERVICES':
      return { ...state, homePhoneServices: action.payload, loading: false, error: null };
    case 'SELECT_HOME_PHONE_SERVICE':
      return { ...state, selectedHomePhoneService: action.payload, error: null };
    case 'GO_TO_STEP': {
      const cleared = resetFromStep(state, action.payload);
      return { ...state, ...cleared };
    }
    case 'RESET_FROM_STEP': {
      const cleared = resetFromStep(state, action.payload);
      return { ...state, ...cleared };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'RESTORE_STATE':
      return { ...action.payload };
    default:
      return state;
  }
}

function getSummary(step: number, state: JourneyState): string | undefined {
  switch (step) {
    case 0:
      return state.postcode ?? undefined;
    case 1:
      return state.selectedAddress?.formattedAddress;
    case 2:
      return state.selectedPlan
        ? `${state.selectedPlan.name} — £${state.selectedPlan.monthlyPrice.toFixed(2)}/mo`
        : undefined;
    case 3:
      return state.selectedAddons.length > 0
        ? `${state.selectedAddons.length} add-on${state.selectedAddons.length > 1 ? 's' : ''} selected`
        : 'No add-ons';
    case 4:
      return state.selectedTvPackage?.name ?? 'No TV package';
    case 5:
      return state.selectedSimPlan?.name ?? 'No SIM plan';
    case 6:
      return state.selectedHomePhoneService?.name ?? 'No home phone';
    default:
      return undefined;
  }
}

function persistState(state: JourneyState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage may be unavailable
  }
}

function loadPersistedState(): JourneyState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as JourneyState;
  } catch {
    // ignore
  }
  return null;
}

export function clearJourneyStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function JourneyWizard() {
  const [state, dispatch] = useReducer(journeyReducer, initialState);
  const prevStepRef = useRef(state.currentStep);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const saved = loadPersistedState();
    if (saved && saved.currentStep > 0) {
      dispatch({ type: 'RESTORE_STATE', payload: saved });
    }
  }, []);

  // Persist state whenever currentStep changes (step completion)
  useEffect(() => {
    if (prevStepRef.current !== state.currentStep) {
      persistState(state);
      prevStepRef.current = state.currentStep;
    }
  }, [state.currentStep, state]);

  const advanceStep = useCallback((toStep: number) => {
    setTimeout(() => {
      dispatch({ type: 'GO_TO_STEP', payload: toStep });
    }, 300);
  }, []);

  const handleGoToStep = useCallback((step: number) => {
    dispatch({ type: 'RESET_FROM_STEP', payload: step });
  }, []);

  const handleOrderConfirm = useCallback(() => {
    clearJourneyStorage();
  }, []);

  return (
    <div>
      <StepProgressBar currentStep={state.currentStep} />

      {STEP_NAMES.map((name, idx) => {
        const active = idx === state.currentStep;
        const completed = idx < state.currentStep;

        return (
          <StepCard
            key={idx}
            stepIndex={idx}
            stepName={name}
            active={active}
            completed={completed}
            summary={completed ? getSummary(idx, state) : undefined}
            onEdit={() => handleGoToStep(idx)}
          >
            {active && (
              <StepContent
                step={idx}
                state={state}
                dispatch={dispatch}
                advanceStep={advanceStep}
                onOrderConfirm={handleOrderConfirm}
              />
            )}
          </StepCard>
        );
      })}
    </div>
  );
}

interface StepContentProps {
  step: number;
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  advanceStep: (toStep: number) => void;
  onOrderConfirm: () => void;
}

function StepContent({ step, state, dispatch, advanceStep, onOrderConfirm }: StepContentProps) {
  // Placeholder content for each step — real step components will replace these
  switch (step) {
    case 0:
      return <PostcodeInput state={state} dispatch={dispatch} advanceStep={advanceStep} />;
    case 1:
      return <AddressSelector state={state} dispatch={dispatch} advanceStep={advanceStep} />;
    case 2:
      return <DealBrowser state={state} dispatch={dispatch} advanceStep={advanceStep} />;
    case 3:
      return <AddonPicker state={state} dispatch={dispatch} advanceStep={advanceStep} />;
    case 4:
      return <TvPicker state={state} dispatch={dispatch} advanceStep={advanceStep} />;
    case 5:
      return <SimPicker state={state} dispatch={dispatch} advanceStep={advanceStep} />;
    case 6:
      return <PhoneServicePicker state={state} dispatch={dispatch} advanceStep={advanceStep} />;
    case 7:
      return <PricingSummary state={state} dispatch={dispatch} onOrderConfirm={onOrderConfirm} />;
    default:
      return null;
  }
}

// Export reducer and helpers for testing and reuse by step components
export { journeyReducer, initialState, STEP_NAMES, getSummary };
export type { StepContentProps };
