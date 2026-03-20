export interface BroadbandAddress {
  uprn: string;
  formattedAddress: string;
  town: string;
  postcode: string;
}

export interface BroadbandAddon {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
}

export interface BroadbandPlan {
  planId: string;
  name: string;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  planType: string;
  technologyType: string;
  contractLengthMonths: number;
  monthlyPrice: number;
  promotionalLabel?: string;
  includesRouter: boolean;
  routerName?: string;
  speedGuaranteeMbps?: number;
  activationFee: number;
  outOfContractPrice?: number;
}

export interface TvPackage {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  channelCount: number;
}

export interface SimPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  maxSpeed: string;
  description: string;
  isUnlimited: boolean;
}

export interface HomePhoneService {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  includesCallsTo: string;
}

export interface UserSelectionPayload {
  sessionId: string;
  postcodeId: string;
  addressId: string;
  selectedPlanId: string;
  selectedAddonIds: string[];
  selectedTvPackageId: string | null;
  selectedSimPlanId: string | null;
  selectedHomePhoneServiceId: string | null;
  totalMonthlyPrice: number;
}

export type JourneyActionType =
  | 'SET_POSTCODE'
  | 'SET_ADDRESSES'
  | 'SELECT_ADDRESS'
  | 'SET_PLANS'
  | 'SELECT_PLAN'
  | 'SET_ADDONS_LIST'
  | 'TOGGLE_ADDON'
  | 'SET_TV_PACKAGES'
  | 'SELECT_TV_PACKAGE'
  | 'SET_SIM_PLANS'
  | 'SELECT_SIM_PLAN'
  | 'SET_HOME_PHONE_SERVICES'
  | 'SELECT_HOME_PHONE_SERVICE'
  | 'GO_TO_STEP'
  | 'RESET_FROM_STEP'
  | 'SET_LOADING'
  | 'SET_ERROR'
  | 'RESTORE_STATE';

export interface JourneyState {
  currentStep: number;
  postcode: string | null;
  addresses: BroadbandAddress[];
  selectedAddress: BroadbandAddress | null;
  plans: BroadbandPlan[];
  selectedPlan: BroadbandPlan | null;
  addonsList: BroadbandAddon[];
  selectedAddons: BroadbandAddon[];
  tvPackages: TvPackage[];
  selectedTvPackage: TvPackage | null;
  simPlans: SimPlan[];
  selectedSimPlan: SimPlan | null;
  homePhoneServices: HomePhoneService[];
  selectedHomePhoneService: HomePhoneService | null;
  loading: boolean;
  error: string | null;
}

export type JourneyAction =
  | { type: 'SET_POSTCODE'; payload: string }
  | { type: 'SET_ADDRESSES'; payload: BroadbandAddress[] }
  | { type: 'SELECT_ADDRESS'; payload: BroadbandAddress }
  | { type: 'SET_PLANS'; payload: BroadbandPlan[] }
  | { type: 'SELECT_PLAN'; payload: BroadbandPlan }
  | { type: 'SET_ADDONS_LIST'; payload: BroadbandAddon[] }
  | { type: 'TOGGLE_ADDON'; payload: BroadbandAddon }
  | { type: 'SET_TV_PACKAGES'; payload: TvPackage[] }
  | { type: 'SELECT_TV_PACKAGE'; payload: TvPackage | null }
  | { type: 'SET_SIM_PLANS'; payload: SimPlan[] }
  | { type: 'SELECT_SIM_PLAN'; payload: SimPlan | null }
  | { type: 'SET_HOME_PHONE_SERVICES'; payload: HomePhoneService[] }
  | { type: 'SELECT_HOME_PHONE_SERVICE'; payload: HomePhoneService | null }
  | { type: 'GO_TO_STEP'; payload: number }
  | { type: 'RESET_FROM_STEP'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESTORE_STATE'; payload: JourneyState };
