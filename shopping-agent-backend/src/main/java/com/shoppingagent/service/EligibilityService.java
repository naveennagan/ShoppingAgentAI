package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EligibilityService {

    private static final Logger logger = LoggerFactory.getLogger(EligibilityService.class);
    private static final String ADDRESSES_TABLE = "addresses";

    private final SupabaseClient supabaseClient;
    private final Gson gson = new Gson();

    public EligibilityService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
    }

    /**
     * Checks whether a UPRN exists in the addresses table.
     * Returns true if the address is found (eligible), false otherwise.
     *
     * @param uprn the Unique Property Reference Number to check
     * @return true if eligible, false if not found
     */
    public boolean checkEligibility(String uprn) {
        logger.debug("Checking eligibility for UPRN: {}", uprn);

        String json = supabaseClient.get(
                ADDRESSES_TABLE,
                "select=uprn&uprn=eq." + uprn
        );

        JsonArray rows = gson.fromJson(json, JsonArray.class);
        boolean eligible = rows != null && rows.size() > 0;

        logger.debug("Eligibility for UPRN {}: {}", uprn, eligible);
        return eligible;
    }
}
