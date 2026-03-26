package com.shoppingagent.service;

import com.shoppingagent.model.BroadbandPlan;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductQualificationServiceTest {

    @Mock
    private SupabaseClient supabaseClient;

    @InjectMocks
    private ProductQualificationService service;

    // JSON for address with FTTP technology
    private static final String ADDRESS_FTTP_JSON = """
            [{"technology_copper":false,"technology_fttp":true,"technology_sogea":false}]
            """;

    // JSON uses "plan_ref" — the real Supabase column name
    private static final String TWO_PLANS_JSON = """
            [
              {"plan_ref":"plan-1","name":"Full Fibre 100","download_speed_mbps":100,"upload_speed_mbps":20,
               "technology_type":"FTTP","contract_length_months":24,"monthly_price":29.99,"promotional_label":"Best Value"},
              {"plan_ref":"plan-2","name":"Full Fibre 500","download_speed_mbps":500,"upload_speed_mbps":100,
               "technology_type":"FTTP","contract_length_months":24,"monthly_price":49.99,"promotional_label":null}
            ]
            """;

    @Test
    void getPlans_twoActivePlans_returnsBothWithAllFieldsMapped() {
        when(supabaseClient.get(eq("addresses"), anyString())).thenReturn(ADDRESS_FTTP_JSON);
        when(supabaseClient.get(eq("broadband_plans"), anyString())).thenReturn(TWO_PLANS_JSON);

        List<BroadbandPlan> plans = service.getPlans("uprn-123");

        assertThat(plans).hasSize(2);

        BroadbandPlan first = plans.get(0);
        assertThat(first.getPlanId()).isEqualTo("plan-1");
        assertThat(first.getName()).isEqualTo("Full Fibre 100");
        assertThat(first.getDownloadSpeedMbps()).isEqualTo(100);
        assertThat(first.getUploadSpeedMbps()).isEqualTo(20);
        assertThat(first.getTechnologyType()).isEqualTo("FTTP");
        assertThat(first.getContractLengthMonths()).isEqualTo(24);
        assertThat(first.getMonthlyPrice()).isEqualTo(29.99);
        assertThat(first.getPromotionalLabel()).isEqualTo("Best Value");

        BroadbandPlan second = plans.get(1);
        assertThat(second.getPlanId()).isEqualTo("plan-2");
        assertThat(second.getName()).isEqualTo("Full Fibre 500");
        assertThat(second.getDownloadSpeedMbps()).isEqualTo(500);
        assertThat(second.getUploadSpeedMbps()).isEqualTo(100);
        assertThat(second.getMonthlyPrice()).isEqualTo(49.99);
        assertThat(second.getPromotionalLabel()).isNull();
    }

    @Test
    void getPlans_emptyArray_returnsEmptyList() {
        when(supabaseClient.get(eq("addresses"), anyString())).thenReturn(ADDRESS_FTTP_JSON);
        when(supabaseClient.get(eq("broadband_plans"), anyString())).thenReturn("[]");

        List<BroadbandPlan> plans = service.getPlans("uprn-123");

        assertThat(plans).isEmpty();
    }

    @Test
    void getPlans_queryAlwaysIncludesIsActiveFilter() {
        when(supabaseClient.get(eq("addresses"), anyString())).thenReturn(ADDRESS_FTTP_JSON);
        when(supabaseClient.get(eq("broadband_plans"), anyString())).thenReturn("[]");

        service.getPlans("uprn-123");

        ArgumentCaptor<String> queryCaptor = ArgumentCaptor.forClass(String.class);
        verify(supabaseClient).get(eq("broadband_plans"), queryCaptor.capture());
        assertThat(queryCaptor.getValue()).contains("is_active=eq.true");
    }

    @Test
    void getPlans_querySelectsPlanRef() {
        when(supabaseClient.get(eq("addresses"), anyString())).thenReturn(ADDRESS_FTTP_JSON);
        when(supabaseClient.get(eq("broadband_plans"), anyString())).thenReturn("[]");

        service.getPlans("uprn-123");

        ArgumentCaptor<String> queryCaptor = ArgumentCaptor.forClass(String.class);
        verify(supabaseClient).get(eq("broadband_plans"), queryCaptor.capture());
        assertThat(queryCaptor.getValue()).contains("plan_ref");
    }

    @Test
    void getPlans_nullPromotionalLabel_isNullNotString() {
        String json = """
                [{"plan_ref":"plan-2","name":"Full Fibre 500","download_speed_mbps":500,"upload_speed_mbps":100,
                  "technology_type":"FTTP","contract_length_months":24,"monthly_price":49.99,"promotional_label":null}]
                """;
        when(supabaseClient.get(eq("addresses"), anyString())).thenReturn(ADDRESS_FTTP_JSON);
        when(supabaseClient.get(eq("broadband_plans"), anyString())).thenReturn(json);

        List<BroadbandPlan> plans = service.getPlans("uprn-123");

        assertThat(plans.get(0).getPromotionalLabel()).isNull();
        assertThat(plans.get(0).getPromotionalLabel()).isNotEqualTo("null");
    }
}
