package com.shoppingagent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoppingagent.exception.BroadbandExceptionHandler;
import com.shoppingagent.model.AlternativePlan;
import com.shoppingagent.model.BroadbandAddress;
import com.shoppingagent.model.BroadbandPlan;
import com.shoppingagent.model.BroadbandRecommendation;
import com.shoppingagent.service.AddressLookupService;
import com.shoppingagent.service.BroadbandAiAdvisorService;
import com.shoppingagent.service.EligibilityService;
import com.shoppingagent.service.ProductQualificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BroadbandController.class)
@Import(BroadbandExceptionHandler.class)
class BroadbandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AddressLookupService addressLookupService;

    @MockBean
    private EligibilityService eligibilityService;

    @MockBean
    private ProductQualificationService productQualificationService;

    @MockBean
    private BroadbandAiAdvisorService broadbandAiAdvisorService;

    @MockBean
    private com.shoppingagent.service.BundledProductService bundledProductService;

    // --- GET /api/broadband/addresses ---

    @Test
    void getAddresses_validPostcode_returns200WithAddresses() throws Exception {
        BroadbandAddress address = new BroadbandAddress("100023456789", "10 Downing Street", "London", "SW1A1AA");
        when(addressLookupService.lookupAddresses("SW1A1AA")).thenReturn(List.of(address));

        mockMvc.perform(get("/api/broadband/addresses").param("postcode", "SW1A1AA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].uprn").value("100023456789"))
                .andExpect(jsonPath("$[0].formattedAddress").value("10 Downing Street"))
                .andExpect(jsonPath("$[0].town").value("London"))
                .andExpect(jsonPath("$[0].postcode").value("SW1A1AA"));
    }

    @Test
    void getAddresses_postcodeToShort_returns400() throws Exception {
        mockMvc.perform(get("/api/broadband/addresses").param("postcode", "AB"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAddresses_postcodeTooLong_returns400() throws Exception {
        mockMvc.perform(get("/api/broadband/addresses").param("postcode", "TOOLONGPOSTCODE"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAddresses_validPostcodeNoResults_returns200WithEmptyArray() throws Exception {
        when(addressLookupService.lookupAddresses("SW1A1AA")).thenReturn(List.of());

        mockMvc.perform(get("/api/broadband/addresses").param("postcode", "SW1A1AA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // --- POST /api/broadband/eligibility ---

    @Test
    void checkEligibility_validUprn_returns200WithEligibleTrue() throws Exception {
        when(eligibilityService.checkEligibility("100023456789")).thenReturn(true);

        String body = objectMapper.writeValueAsString(Map.of("uprn", "100023456789"));

        mockMvc.perform(post("/api/broadband/eligibility")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true));
    }

    // --- POST /api/broadband/products ---

    @Test
    void getProducts_validUprn_returns200WithPlanList() throws Exception {
        BroadbandPlan plan = new BroadbandPlan("plan-1", "Full Fibre 100", 100, 20, null, "FTTP", 24, 29.99, "Best Value", false, null, 0, 0.0, 0.0);
        when(productQualificationService.getPlans("100023456789")).thenReturn(List.of(plan));

        String body = objectMapper.writeValueAsString(Map.of("uprn", "100023456789"));

        mockMvc.perform(post("/api/broadband/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].planId").value("plan-1"))
                .andExpect(jsonPath("$[0].name").value("Full Fibre 100"))
                .andExpect(jsonPath("$[0].downloadSpeedMbps").value(100))
                .andExpect(jsonPath("$[0].monthlyPrice").value(29.99));
    }

    // --- POST /api/broadband/recommend ---

    @Test
    void recommend_validRequest_returns200WithRecommendation() throws Exception {
        BroadbandPlan topPlan = new BroadbandPlan("plan-1", "Full Fibre 100", 100, 20, null, "FTTP", 24, 29.99, null, false, null, 0, 0.0, 0.0);
        BroadbandPlan altPlan = new BroadbandPlan("plan-2", "Full Fibre 500", 500, 100, null, "FTTP", 24, 49.99, null, false, null, 0, 0.0, 0.0);
        BroadbandRecommendation recommendation = new BroadbandRecommendation(
                topPlan,
                "Great for everyday browsing and streaming.",
                List.of(new AlternativePlan(altPlan, "Faster speeds if needed."))
        );
        when(broadbandAiAdvisorService.recommend(anyList(), anyString())).thenReturn(recommendation);

        BroadbandController.RecommendRequest request = new BroadbandController.RecommendRequest();
        request.setPlans(List.of(topPlan, altPlan));
        request.setUsageDescription("I stream HD video and work from home.");

        mockMvc.perform(post("/api/broadband/recommend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topPlan.planId").value("plan-1"))
                .andExpect(jsonPath("$.topPlanReasoning").value("Great for everyday browsing and streaming."))
                .andExpect(jsonPath("$.alternatives[0].plan.planId").value("plan-2"));
    }
}
