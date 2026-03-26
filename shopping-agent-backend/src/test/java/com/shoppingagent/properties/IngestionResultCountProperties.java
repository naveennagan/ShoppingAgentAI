package com.shoppingagent.properties;

import com.shoppingagent.exception.EmbeddingException;
import com.shoppingagent.model.IngestionResult;
import com.shoppingagent.model.Product;
import com.shoppingagent.service.EmbeddingService;
import com.shoppingagent.service.IngestionService;
import com.shoppingagent.service.ProductService;
import com.shoppingagent.service.SupabaseClient;
import net.jqwik.api.*;

import java.lang.reflect.Field;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Feature: broadband-chat-ux-improvements, Property 11: Ingestion result counts are consistent
 * Validates: Requirements 7.6
 *
 * For any ingestion run with random success/failure distributions,
 * totalIngested + failures must equal the total number of items attempted,
 * and failedSourceIds must contain exactly the IDs of the failed items.
 */
class IngestionResultCountProperties {

    private static final float[] FAKE_EMBEDDING = new float[768];

    private void setField(Object target, String fieldName, int value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.setInt(target, value);
    }

    @Provide
    Arbitrary<List<Product>> productLists() {
        Arbitrary<Product> productArb = Arbitraries.integers().between(0, 999999)
                .map(i -> {
                    String uniqueId = UUID.randomUUID().toString();
                    Product p = new Product();
                    p.setId(uniqueId);
                    p.setName("PROD_" + uniqueId);
                    p.setPrice(i * 1.0);
                    p.setDescription("Desc " + i);
                    p.setCategory("Cat");
                    p.setBrand("Brand");
                    p.setRating(4.0);
                    p.setSpecs(Map.of());
                    p.setStock(10);
                    p.setTags(List.of());
                    return p;
                });
        return productArb.list().ofMinSize(1).ofMaxSize(25);
    }

    /**
     * Property 11: Ingestion result counts are consistent.
     *
     * Given N products with a random subset marked to fail embedding,
     * ingestAll() must report totalIngested + failures == N,
     * and failedSourceIds must match exactly the IDs of the failing products.
     */
    @Property(tries = 100)
    void ingestionResultCountsAreConsistent(
            @ForAll("productLists") List<Product> products,
            @ForAll Random random) throws Exception {

        // Randomly decide which products will fail
        Set<String> failingNames = new HashSet<>();
        Set<String> expectedFailedIds = new HashSet<>();
        for (Product p : products) {
            if (random.nextBoolean()) {
                failingNames.add(p.getName());
                expectedFailedIds.add(p.getId());
            }
        }

        int expectedSuccesses = products.size() - expectedFailedIds.size();
        int expectedFailures = expectedFailedIds.size();

        EmbeddingService embeddingService = mock(EmbeddingService.class);
        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        ProductService productService = mock(ProductService.class);

        when(productService.getAllProducts()).thenReturn(products);
        when(supabaseClient.post(eq("knowledge_documents"), anyString())).thenReturn("[]");
        when(supabaseClient.delete(anyString(), anyString())).thenReturn("");
        when(supabaseClient.get(eq("broadband_plans"), anyString())).thenReturn("[]");

        when(embeddingService.generateEmbedding(anyString())).thenAnswer(invocation -> {
            String content = invocation.getArgument(0);
            for (String failName : failingNames) {
                if (content.contains(failName)) {
                    throw new EmbeddingException(
                            "Embedding failed with status 500", 500, "Server error");
                }
            }
            return FAKE_EMBEDDING;
        });

        IngestionService service = new IngestionService(productService, supabaseClient, embeddingService);
        setField(service, "itemDelayMs", 0);
        setField(service, "batchSize", 100);
        setField(service, "batchPauseMs", 0);
        setField(service, "maxRetries", 0);

        IngestionResult result = service.ingestAll();

        // Core invariant: totalIngested + failures == total items attempted
        assertThat(result.getTotalIngested() + result.getFailures())
                .as("totalIngested + failures must equal total items attempted")
                .isEqualTo(products.size());

        assertThat(result.getTotalIngested()).isEqualTo(expectedSuccesses);
        assertThat(result.getFailures()).isEqualTo(expectedFailures);
        assertThat(new HashSet<>(result.getFailedSourceIds())).isEqualTo(expectedFailedIds);
    }

    /**
     * Property 11 (edge case): When all items succeed, failures == 0 and totalIngested == N.
     */
    @Property(tries = 50)
    void allSuccessesYieldZeroFailures(
            @ForAll("productLists") List<Product> products) throws Exception {

        EmbeddingService embeddingService = mock(EmbeddingService.class);
        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        ProductService productService = mock(ProductService.class);

        when(productService.getAllProducts()).thenReturn(products);
        when(supabaseClient.post(eq("knowledge_documents"), anyString())).thenReturn("[]");
        when(supabaseClient.delete(anyString(), anyString())).thenReturn("");
        when(supabaseClient.get(eq("broadband_plans"), anyString())).thenReturn("[]");
        when(embeddingService.generateEmbedding(anyString())).thenReturn(FAKE_EMBEDDING);

        IngestionService service = new IngestionService(productService, supabaseClient, embeddingService);
        setField(service, "itemDelayMs", 0);
        setField(service, "batchSize", 100);
        setField(service, "batchPauseMs", 0);
        setField(service, "maxRetries", 0);

        IngestionResult result = service.ingestAll();

        assertThat(result.getTotalIngested() + result.getFailures()).isEqualTo(products.size());
        assertThat(result.getTotalIngested()).isEqualTo(products.size());
        assertThat(result.getFailures()).isZero();
        assertThat(result.getFailedSourceIds()).isEmpty();
    }

    /**
     * Property 11 (edge case): When all items fail, totalIngested == 0 and failures == N.
     */
    @Property(tries = 50)
    void allFailuresYieldZeroSuccesses(
            @ForAll("productLists") List<Product> products) throws Exception {

        EmbeddingService embeddingService = mock(EmbeddingService.class);
        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        ProductService productService = mock(ProductService.class);

        when(productService.getAllProducts()).thenReturn(products);
        when(supabaseClient.post(eq("knowledge_documents"), anyString())).thenReturn("[]");
        when(supabaseClient.delete(anyString(), anyString())).thenReturn("");
        when(supabaseClient.get(eq("broadband_plans"), anyString())).thenReturn("[]");
        when(embeddingService.generateEmbedding(anyString()))
                .thenThrow(new EmbeddingException("Failed", 500, "Server error"));

        IngestionService service = new IngestionService(productService, supabaseClient, embeddingService);
        setField(service, "itemDelayMs", 0);
        setField(service, "batchSize", 100);
        setField(service, "batchPauseMs", 0);
        setField(service, "maxRetries", 0);

        IngestionResult result = service.ingestAll();

        assertThat(result.getTotalIngested() + result.getFailures()).isEqualTo(products.size());
        assertThat(result.getTotalIngested()).isZero();
        assertThat(result.getFailures()).isEqualTo(products.size());
        assertThat(result.getFailedSourceIds()).hasSize(products.size());
    }
}
