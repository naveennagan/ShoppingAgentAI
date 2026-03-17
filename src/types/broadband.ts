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
  technologyType: string;
  contractLengthMonths: number;
  monthlyPrice: number;
  promotionalLabel?: string;
}
