package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.shoppingagent.model.BroadbandAddress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AddressLookupService {

    private static final Logger logger = LoggerFactory.getLogger(AddressLookupService.class);
    private static final String ADDRESSES_TABLE = "addresses";

    private final SupabaseClient supabaseClient;
    private final Gson gson = new Gson();

    public AddressLookupService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
    }

    /**
     * Looks up addresses for a given postcode by querying the Supabase addresses table.
     *
     * @param postcode the UK postcode to look up
     * @return list of matching BroadbandAddress objects, empty list if none found
     */
    public List<BroadbandAddress> lookupAddresses(String postcode) {
        logger.debug("Looking up addresses for postcode: {}", postcode);

        // Normalise postcode: trim, uppercase, ensure space before inward code (last 3 chars)
        String raw = postcode.trim().toUpperCase().replaceAll("\\s+", "");
        String normalisedPostcode = raw.length() > 3
                ? raw.substring(0, raw.length() - 3) + " " + raw.substring(raw.length() - 3)
                : raw;

        // First resolve postcode_id from the postcodes table
        String encodedPostcode = java.net.URLEncoder.encode(normalisedPostcode, java.nio.charset.StandardCharsets.UTF_8);
        String postcodeJson = supabaseClient.get(
                "postcodes",
                "select=id&postcode=eq." + encodedPostcode
        );
        JsonArray postcodeRows = gson.fromJson(postcodeJson, JsonArray.class);
        if (postcodeRows == null || postcodeRows.size() == 0) {
            logger.debug("No postcode record found for: {}", normalisedPostcode);
            return new ArrayList<>();
        }
        String postcodeId = postcodeRows.get(0).getAsJsonObject().get("id").getAsString();

        // Fetch addresses for that postcode_id
        String json = supabaseClient.get(
                ADDRESSES_TABLE,
                "select=uprn,full_address,city&postcode_id=eq." + postcodeId
        );

        List<BroadbandAddress> addresses = new ArrayList<>();
        JsonArray rows = gson.fromJson(json, JsonArray.class);
        if (rows == null) {
            return addresses;
        }

        for (JsonElement element : rows) {
            JsonObject row = element.getAsJsonObject();
            BroadbandAddress address = new BroadbandAddress(
                    getStringOrNull(row, "uprn"),
                    getStringOrNull(row, "full_address"),
                    getStringOrNull(row, "city"),
                    normalisedPostcode
            );
            addresses.add(address);
        }

        logger.debug("Found {} addresses for postcode: {}", addresses.size(), normalisedPostcode);
        return addresses;
    }

    private String getStringOrNull(JsonObject obj, String key) {
        JsonElement el = obj.get(key);
        return (el != null && !el.isJsonNull()) ? el.getAsString() : null;
    }
}
