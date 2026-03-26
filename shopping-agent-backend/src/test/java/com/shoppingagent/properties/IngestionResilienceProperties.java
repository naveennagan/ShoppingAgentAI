package com.shoppingagent.properties;

import com.shoppingagent.exception.EmbeddingException;
import com.shoppingagent.model.IngestionResult;
import com.shoppingagent.model.Product;
import com.shoppingagent.service.EmbeddingService;
import com.shoppingagent.service.IngestionService;
import com.shoppingagent.service.ProductService;
import com.shoppingagent.service.SupabaseClient;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Feature: broadband-chat-ux-improvements, Property 10: Single failure does not halt pipeline
 * Validates: Requirements 7.4, 7.5
 *
 * For any batch of N items where exactly one item's embedding call fails permanently
 * (after retries), the ingestion result should report (N-1) successes and 1 failure,
 * and the failed item's source ID should appear in failedSourceIds.
 */
class IngestionResilienceProperties {

    private static final float[] FAKE_EMBEDDING = new float[768];

    private IngestionService buildService(
            List<Product> products,
            String failingProductName,
            int failStatusCode,
            int maxRetries,
            EmbeddingService embeddingService,
            SupabaseClient supabaseClient,
            ProductService productService) throws Exception {

        when(productService.getAllProducts()).thenReturn(products);
        when(supabaseClient.post(eq("knowledge_documents"), anyString())).thenReturn("[]");
        when(supabaseClient.delete(anyString(), anyString())).thenReturn("");
        when(supabaseClient.get(eq("broadband_plans"), anyString())).thenReturn("[]");

        // Use an Answer to decide per-call whether to succeed or throw
        when(embeddingService.generateEmbedding(anyString())).thenAnswer(invocation -> {
            String content = invocation.getArgument(0);
            if (content.contains(failingProductName)) {
                throw new EmbeddingException(
                        "Embedding failed with status " + failStatusCode,
                        failStatusCode,
                        "Error body for status " + failStatusCode);
            }
            return FAKE_EMBEDDING;
        });

        IngestionService service = new IngestionService(productService, supabaseClient, embeddingService);

        setField(service, "itemDelayMs", 0);
        setField(service, "batchSize", 100);
        setField(service, "batchPauseMs", 0);
        setField(service, "maxRetries", maxRetries);

        return service;
    }

    private void setField(Object target, String fieldName, int value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.setInt(target, value);
    }

    @Provide
    Arbitrary<List<Product>> productBatches() {
        // Use unique names to avoid content collisions in the Answer matcher
        Arbitrary<Product> productArb = Arbitraries.integers().between(0, 999999)
                .map(i -> {
                    String uniqueId = UUID.randomUUID().toString();
                    Product p = new Product();
                    p.setId(uniqueId);
                    p.setName("UNIQ_" + uniqueId);
                    p.setPrice(i * 1.5);
                    p.setDescription("Desc " + i);
                    p.setCategory("Cat");
                    p.setBrand("Brand");
                    p.setRating(4.0);
                    p.setSpecs(Map.of());
                    p.setStock(10);
                    p.setTags(List.of());
                    return p;
                });
        return productArb.list().ofMinSize(2).ofMaxSize(20);
    }

    /**
     * Property 10: Single non-retryable failure does not halt pipeline.
     *
     * Given N products where exactly one triggers a permanent (HTTP 400) EmbeddingException,
     * ingestAll() should report (N-1) successes and 1 failure.
     */
    @Property(tries = 100)
    void singlePermanentFailureDoesNotHaltPipeline(
            @ForAll("productBatches") List<Product> products,
            @ForAll @IntRange(min = 0, max = 10000) int failIndexSeed) throws Exception {

        int failIndex = failIndexSeed % products.size();
        Product failingProduct = products.get(failIndex);

        EmbeddingService embeddingService = mock(EmbeddingService.class);
        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        ProductService productService = mock(ProductService.class);

        IngestionService service = buildService(
                products, failingProduct.getName(), 400, 0,
                embeddingService, supabaseClient, productService);

        IngestionResult result = service.ingestAll();

        int totalItems = products.size();
        assertThat(result.getTotalIngested()).isEqualTo(totalItems - 1);
        assertThat(result.getFailures()).isEqualTo(1);
        assertThat(result.getTotalIngested() + result.getFailures()).isEqualTo(totalItems);
        assertThat(result.getFailedSourceIds()).containsExactly(failingProduct.getId());
    }

    /**
     * Property 10: Single retryable failure (exhausting retries) does not halt pipeline.
     *
     * Given N products where exactly one triggers a retryable (HTTP 429) EmbeddingException
     * that persists through all retry attempts, ingestAll() should still report (N-1)
     * successes and 1 failure.
     */
    @Property(tries = 100)
    void singleRetryableFailureExhaustingRetriesDoesNotHaltPipeline(
            @ForAll("productBatches") List<Product> products,
            @ForAll @IntRange(min = 0, max = 10000) int failIndexSeed) throws Exception {

        int failIndex = failIndexSeed % products.size();
        Product failingProduct = products.get(failIndex);

        EmbeddingService embeddingService = mock(EmbeddingService.class);
        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        ProductService productService = mock(ProductService.class);

        IngestionService service = buildService(
                products, failingProduct.getName(), 429, 0,
                embeddingService, supabaseClient, productService);

        IngestionResult result = service.ingestAll();

        int totalItems = products.size();
        assertThat(result.getTotalIngested()).isEqualTo(totalItems - 1);
        assertThat(result.getFailures()).isEqualTo(1);
        assertThat(result.getTotalIngested() + result.getFailures()).isEqualTo(totalItems);
        assertThat(result.getFailedSourceIds()).containsExactly(failingProduct.getId());
    }
}
