package com.shoppingagent.service;

import com.shoppingagent.model.BroadbandAddress;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AddressLookupServiceTest {

    @Mock
    private SupabaseClient supabaseClient;

    private AddressLookupService service;

    // Postcode lookup response — returns a UUID id
    private static final String POSTCODE_ROW = "[{\"id\":\"uuid-pc-1\"}]";
    // Address rows using real schema column names
    private static final String ADDRESS_ROWS =
            "[{\"uprn\":\"100023456789\",\"full_address\":\"10 Downing Street\",\"city\":\"London\"}]";

    @BeforeEach
    void setUp() {
        service = new AddressLookupService(supabaseClient);
    }

    @Test
    void knownPostcode_returnsMatchingAddresses() {
        // Step 1: postcodes lookup
        when(supabaseClient.get(eq("postcodes"), contains("SW1A+1AA")))
                .thenReturn(POSTCODE_ROW);
        // Step 2: addresses lookup by postcode_id
        when(supabaseClient.get(eq("addresses"), contains("uuid-pc-1")))
                .thenReturn(ADDRESS_ROWS);

        List<BroadbandAddress> result = service.lookupAddresses("SW1A1AA");

        assertEquals(1, result.size());
        BroadbandAddress addr = result.get(0);
        assertEquals("100023456789", addr.getUprn());
        assertEquals("10 Downing Street", addr.getFormattedAddress());
        assertEquals("London", addr.getTown());
        assertEquals("SW1A 1AA", addr.getPostcode()); // normalised with space
    }

    @Test
    void unknownPostcode_returnsEmptyList() {
        // postcodes table returns empty — no postcode_id found
        when(supabaseClient.get(eq("postcodes"), anyString())).thenReturn("[]");

        List<BroadbandAddress> result = service.lookupAddresses("ZZ99ZZ");

        assertTrue(result.isEmpty());
        // addresses table should never be queried
        verify(supabaseClient, never()).get(eq("addresses"), anyString());
    }

    @Test
    void lowercasePostcode_normalisedToUppercaseBeforeQuery() {
        when(supabaseClient.get(eq("postcodes"), anyString())).thenReturn("[]");

        service.lookupAddresses("sw1a1aa");

        // Verify the query contains the URL-encoded uppercase normalised postcode
        verify(supabaseClient).get(eq("postcodes"), contains("SW1A+1AA"));
    }

    @Test
    void nullJsonFromPostcodesTable_returnsEmptyList() {
        when(supabaseClient.get(eq("postcodes"), anyString())).thenReturn(null);

        List<BroadbandAddress> result = service.lookupAddresses("SW1A1AA");

        assertTrue(result.isEmpty());
    }

    @Test
    void nullJsonFromAddressesTable_returnsEmptyList() {
        when(supabaseClient.get(eq("postcodes"), anyString())).thenReturn(POSTCODE_ROW);
        when(supabaseClient.get(eq("addresses"), anyString())).thenReturn(null);

        List<BroadbandAddress> result = service.lookupAddresses("SW1A1AA");

        assertTrue(result.isEmpty());
    }
}
