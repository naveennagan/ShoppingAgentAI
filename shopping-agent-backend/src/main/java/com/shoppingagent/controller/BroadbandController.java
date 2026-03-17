package com.shoppingagent.controller;

import com.shoppingagent.exception.BroadbandApiException;
import com.shoppingagent.model.BroadbandAddress;
import com.shoppingagent.model.BroadbandPlan;
import com.shoppingagent.model.BroadbandRecommendation;
import com.shoppingagent.service.AddressLookupService;
import com.shoppingagent.service.BroadbandAiAdvisorService;
import com.shoppingagent.service.EligibilityService;
import com.shoppingagent.service.ProductQualificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/broadband")
@CrossOrigin(origins = "http://localhost:3000")
public class BroadbandController {

    private static final Logger logger = LoggerFactory.getLogger(BroadbandController.class);

    private final AddressLookupService addressLookupService;
    private final EligibilityService eligibilityService;
    private final ProductQualificationService productQualificationService;
    private final BroadbandAiAdvisorService broadbandAiAdvisorService;

    public BroadbandController(AddressLookupService addressLookupService,
                                EligibilityService eligibilityService,
                                ProductQualificationService productQualificationService,
                                BroadbandAiAdvisorService broadbandAiAdvisorService) {
        this.addressLookupService = addressLookupService;
        this.eligibilityService = eligibilityService;
        this.productQualificationService = productQualificationService;
        this.broadbandAiAdvisorService = broadbandAiAdvisorService;
    }

    @GetMapping("/addresses")
    public ResponseEntity<List<BroadbandAddress>> getAddresses(@RequestParam String postcode) {
        logger.info("GET /api/broadband/addresses?postcode={}", postcode);
        if (postcode.length() < 5 || postcode.length() > 8) {
            throw new BroadbandApiException("Invalid postcode format", HttpStatus.BAD_REQUEST);
        }
        List<BroadbandAddress> addresses = addressLookupService.lookupAddresses(postcode);
        return ResponseEntity.ok(addresses);
    }

    @PostMapping("/eligibility")
    public ResponseEntity<Map<String, Boolean>> checkEligibility(@RequestBody Map<String, String> body) {
        String uprn = body.get("uprn");
        logger.info("POST /api/broadband/eligibility uprn={}", uprn);
        boolean eligible = eligibilityService.checkEligibility(uprn);
        return ResponseEntity.ok(Map.of("eligible", eligible));
    }

    @PostMapping("/products")
    public ResponseEntity<List<BroadbandPlan>> getProducts(@RequestBody Map<String, String> body) {
        String uprn = body.get("uprn");
        logger.info("POST /api/broadband/products uprn={}", uprn);
        List<BroadbandPlan> plans = productQualificationService.getPlans(uprn);
        return ResponseEntity.ok(plans);
    }

    @GetMapping("/addons")
    public ResponseEntity<List<Map<String, Object>>> getAddons() {
        logger.info("GET /api/broadband/addons");
        List<Map<String, Object>> addons = productQualificationService.getAddons();
        return ResponseEntity.ok(addons);
    }

    @PostMapping("/recommend")
    public ResponseEntity<BroadbandRecommendation> recommend(@RequestBody RecommendRequest request) {
        logger.info("POST /api/broadband/recommend usageDescription={}", request.getUsageDescription());
        BroadbandRecommendation recommendation =
                broadbandAiAdvisorService.recommend(request.getPlans(), request.getUsageDescription());
        return ResponseEntity.ok(recommendation);
    }

    public static class RecommendRequest {
        private List<BroadbandPlan> plans;
        private String usageDescription;

        public List<BroadbandPlan> getPlans() { return plans; }
        public void setPlans(List<BroadbandPlan> plans) { this.plans = plans; }
        public String getUsageDescription() { return usageDescription; }
        public void setUsageDescription(String usageDescription) { this.usageDescription = usageDescription; }
    }
}
