package com.shoppingagent.properties;

import com.google.gson.Gson;
import com.shoppingagent.model.BroadbandPlan;
import com.shoppingagent.model.Product;
import com.shoppingagent.service.BroadbandPlanService;
import com.shoppingagent.service.EmbeddingService;
import com.shoppingagent.service.IngestionService;
import com.shoppingagent.service.ProductService;
import com.shoppingagent.service.SupabaseClient;
import net.jqwik.api.*;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Feature: ai-rag-enhanced-chat, Property 21: Catalog change triggers re-embedding
 * Validates: Requirements 2.5, 9.1, 9.2
 *
 * For any product or broadband plan that is created or updated, the corresponding
 * knowledge document in the vector store shall be updated with a new embedding
 * reflecting the current data.
 */
class CatalogChangeReEmbeddingProperties {

    private static final Gson gson = new Gson();
    private static final float[] FAKE_EMBEDDING = new float[768];

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private record ProductServiceDeps(
            ProductService productService,
            SupabaseClient supabaseClient,
            IngestionService ingestionService,
            EmbeddingService embeddingService
    ) {}

    private record BroadbandServiceDeps(
            BroadbandPlanService broadbandPlanService,
            SupabaseClient supabaseClient,
            IngestionService ingestionService,
            EmbeddingService embeddingService
    ) {}

    private ProductServiceDeps buildProductService() {
        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        EmbeddingService embeddingService = mock(EmbeddingService.class);
        when(embeddingService.generateEmbedding(anyString())).thenReturn(FAKE_EMBEDDING);

        IngestionService ingestionService = new IngestionService(null, supabaseClient, embeddingService);
        ProductService productService = new ProductService(supabaseClient, ingestionService);

        return new ProductServiceDeps(productService, supabaseClient, ingestionService, embeddingService);
    }

    private BroadbandServiceDeps buildBroadbandPlanService() {
        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        EmbeddingService embeddingService = mock(EmbeddingService.class);
        when(embeddingService.generateEmbedding(anyString())).thenReturn(FAKE_EMBEDDING);

        IngestionService ingestionService = new IngestionService(null, supabaseClient, embeddingService);
        BroadbandPlanService broadbandPlanService = new BroadbandPlanService(supabaseClient, ingestionService);

        return new BroadbandServiceDeps(broadbandPlanService, supabaseClient, ingestionService, embeddingService);
    }

    /**
     * Builds the JSON array response that SupabaseClient.post/patch returns
     * for a single product.
     */
    private String productToJsonArray(Product product) {
        return "[" + gson.toJson(product) + "]";
    }

    /**
     * Builds the JSON array response that SupabaseClient.post/patch returns
     * for a single broadband plan, using the DB column names.
     */
    private String broadbandPlanToJsonArray(BroadbandPlan plan) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("plan_ref", plan.getPlanId());
        row.put("name", plan.getName());
        row.put("download_speed_mbps", plan.getDownloadSpeedMbps());
        row.put("upload_speed_mbps", plan.getUploadSpeedMbps());
        row.put("plan_type", plan.getPlanType());
        row.put("technology_type", plan.getTechnologyType());
        row.put("contract_length_months", plan.getContractLengthMonths());
        row.put("monthly_price", plan.getMonthlyPrice());
        row.put("promotional_label", plan.getPromotionalLabel());
        row.put("includes_router", plan.isIncludesRouter());
        row.put("router_name", plan.getRouterName());
        row.put("speed_guarantee_mbps", plan.getSpeedGuaranteeMbps());
        row.put("activation_fee", plan.getActivationFee());
        row.put("out_of_contract_price", plan.getOutOfContractPrice());
        return "[" + gson.toJson(row) + "]";
    }

    // -------------------------------------------------------------------------
    // Arbitraries
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<Product> products() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().ofLength(8)
                .map(s -> UUID.nameUUIDFromBytes(s.getBytes()).toString());
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(2).ofMaxLength(30);
        Arbitrary<Double> prices = Arbitraries.doubles().between(0.01, 9999.99);
        Arbitrary<String> descriptions = Arbitraries.strings().alpha().ofMinLength(5).ofMaxLength(100);
        Arbitrary<String> categories = Arbitraries.of("Mobile", "Laptop", "Tablet", "Audio", "Wearable");
        Arbitrary<String> brands = Arbitraries.of("Apple", "Samsung", "Sony", "Google", "OnePlus");
        Arbitrary<Double> ratings = Arbitraries.doubles().between(0.0, 5.0);
        Arbitrary<Map<String, String>> specs = Arbitraries.maps(
                Arbitraries.of("Storage", "RAM", "Display", "Camera", "Battery"),
                Arbitraries.strings().alpha().ofMinLength(2).ofMaxLength(20)
        ).ofMinSize(0).ofMaxSize(3);

        return Combinators.combine(ids, names, prices, descriptions, categories, brands, ratings, specs)
                .as((id, name, price, desc, cat, brand, rating, sp) -> {
                    Product p = new Product();
                    p.setId(id);
                    p.setName(name);
                    p.setPrice(price);
                    p.setDescription(desc);
                    p.setCategory(cat);
                    p.setBrand(brand);
                    p.setRating(rating);
                    p.setSpecs(sp);
                    p.setStock(10);
                    p.setTags(List.of());
                    return p;
                });
    }

    @Provide
    Arbitrary<BroadbandPlan> broadbandPlans() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().ofLength(8)
                .map(s -> UUID.nameUUIDFromBytes(s.getBytes()).toString());
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(2).ofMaxLength(30);
        Arbitrary<Integer> downloadSpeeds = Arbitraries.integers().between(10, 1000);
        Arbitrary<Integer> uploadSpeeds = Arbitraries.integers().between(5, 500);
        Arbitrary<String> techTypes = Arbitraries.of("FTTC", "FTTP", "ADSL", "Cable");
        Arbitrary<Integer> contractLengths = Arbitraries.of(12, 18, 24);
        Arbitrary<Double> monthlyPrices = Arbitraries.doubles().between(15.0, 99.99);
        Arbitrary<String> promoLabels = Arbitraries.of("Best Value", "Most Popular", null);

        return Combinators.combine(ids, names, downloadSpeeds, uploadSpeeds, techTypes, contractLengths, monthlyPrices, promoLabels)
                .as((id, name, dl, ul, tech, contract, price, promo) ->
                        new BroadbandPlan(id, name, dl, ul, "fibre", tech, contract, price, promo,
                                true, "Router X", dl / 2, 0.0, price + 10.0));
    }

    // -------------------------------------------------------------------------
    // Property 21: Product create triggers re-embedding
    // -------------------------------------------------------------------------

    /**
     * Feature: ai-rag-enhanced-chat, Property 21: Catalog change triggers re-embedding
     * Validates: Requirements 2.5, 9.1
     *
     * For any product that is created, the EmbeddingService shall be called
     * with content reflecting the product's current data, and the result
     * shall be posted to the knowledge_documents table.
     */
    @Property(tries = 100)
    void productCreateTriggersReEmbedding(@ForAll("products") Product product) {
        ProductServiceDeps deps = buildProductService();
        String jsonResponse = productToJsonArray(product);

        when(deps.supabaseClient.post(eq("products"), anyString())).thenReturn(jsonResponse);
        when(deps.supabaseClient.post(eq("knowledge_documents"), anyString())).thenReturn("[]");

        deps.productService.createProduct(product);

        // Verify embedding was generated with content containing the product's current data
        verify(deps.embeddingService, atLeastOnce()).generateEmbedding(argThat(content ->
                content.contains(product.getName()) &&
                content.contains(product.getBrand()) &&
                content.contains(product.getCategory()) &&
                content.contains(String.format("%.2f", product.getPrice()))
        ));

        // Verify the document was posted to knowledge_documents
        verify(deps.supabaseClient, atLeastOnce()).post(eq("knowledge_documents"), argThat(json ->
                json.contains(product.getName()) &&
                json.contains("product") &&
                json.contains(product.getId())
        ));
    }

    /**
     * Feature: ai-rag-enhanced-chat, Property 21: Catalog change triggers re-embedding
     * Validates: Requirements 2.5, 9.1
     *
     * For any product that is updated, the EmbeddingService shall be called
     * with content reflecting the product's updated data.
     */
    @Property(tries = 100)
    void productUpdateTriggersReEmbedding(@ForAll("products") Product product) {
        ProductServiceDeps deps = buildProductService();
        String jsonResponse = productToJsonArray(product);

        when(deps.supabaseClient.patch(eq("products"), anyString(), anyString())).thenReturn(jsonResponse);
        when(deps.supabaseClient.post(eq("knowledge_documents"), anyString())).thenReturn("[]");

        deps.productService.updateProduct(product.getId(), product);

        verify(deps.embeddingService, atLeastOnce()).generateEmbedding(argThat(content ->
                content.contains(product.getName()) &&
                content.contains(product.getBrand())
        ));

        verify(deps.supabaseClient, atLeastOnce()).post(eq("knowledge_documents"), argThat(json ->
                json.contains(product.getId())
        ));
    }

    // -------------------------------------------------------------------------
    // Property 21: Broadband plan create triggers re-embedding
    // -------------------------------------------------------------------------

    /**
     * Feature: ai-rag-enhanced-chat, Property 21: Catalog change triggers re-embedding
     * Validates: Requirements 2.5, 9.2
     *
     * For any broadband plan that is created, the EmbeddingService shall be called
     * with content reflecting the plan's current data, and the result shall be
     * posted to the knowledge_documents table.
     */
    @Property(tries = 100)
    void broadbandPlanCreateTriggersReEmbedding(@ForAll("broadbandPlans") BroadbandPlan plan) {
        BroadbandServiceDeps deps = buildBroadbandPlanService();
        String jsonResponse = broadbandPlanToJsonArray(plan);

        when(deps.supabaseClient.post(eq("broadband_plans"), anyString())).thenReturn(jsonResponse);
        when(deps.supabaseClient.post(eq("knowledge_documents"), anyString())).thenReturn("[]");

        deps.broadbandPlanService.createPlan(plan);

        verify(deps.embeddingService, atLeastOnce()).generateEmbedding(argThat(content ->
                content.contains(plan.getName()) &&
                content.contains(String.valueOf(plan.getDownloadSpeedMbps())) &&
                content.contains(String.valueOf(plan.getUploadSpeedMbps())) &&
                content.contains(plan.getTechnologyType())
        ));

        verify(deps.supabaseClient, atLeastOnce()).post(eq("knowledge_documents"), argThat(json ->
                json.contains(plan.getPlanId()) &&
                json.contains("broadband_plan")
        ));
    }

    /**
     * Feature: ai-rag-enhanced-chat, Property 21: Catalog change triggers re-embedding
     * Validates: Requirements 2.5, 9.2
     *
     * For any broadband plan that is updated, the EmbeddingService shall be called
     * with content reflecting the plan's updated data.
     */
    @Property(tries = 100)
    void broadbandPlanUpdateTriggersReEmbedding(@ForAll("broadbandPlans") BroadbandPlan plan) {
        BroadbandServiceDeps deps = buildBroadbandPlanService();
        String jsonResponse = broadbandPlanToJsonArray(plan);

        when(deps.supabaseClient.patch(eq("broadband_plans"), anyString(), anyString())).thenReturn(jsonResponse);
        when(deps.supabaseClient.post(eq("knowledge_documents"), anyString())).thenReturn("[]");

        deps.broadbandPlanService.updatePlan(plan.getPlanId(), plan);

        verify(deps.embeddingService, atLeastOnce()).generateEmbedding(argThat(content ->
                content.contains(plan.getName()) &&
                content.contains(String.valueOf(plan.getDownloadSpeedMbps()))
        ));

        verify(deps.supabaseClient, atLeastOnce()).post(eq("knowledge_documents"), argThat(json ->
                json.contains(plan.getPlanId())
        ));
    }

    // -------------------------------------------------------------------------
    // Property 21: Embedding content reflects current data
    // -------------------------------------------------------------------------

    /**
     * Feature: ai-rag-enhanced-chat, Property 21: Catalog change triggers re-embedding
     * Validates: Requirements 2.5, 9.1
     *
     * For any product, the content string built for embedding shall contain
     * all required product fields: name, brand, category, price, description, rating.
     */
    @Property(tries = 100)
    void productEmbeddingContentReflectsAllFields(@ForAll("products") Product product) {
        IngestionService ingestionService = new IngestionService(null, null, null);
        String content = ingestionService.buildProductContent(product);

        assertThat(content).contains(product.getName());
        assertThat(content).contains(product.getBrand());
        assertThat(content).contains(product.getCategory());
        assertThat(content).contains(String.format("%.2f", product.getPrice()));
        assertThat(content).contains(product.getDescription());
        assertThat(content).contains(String.valueOf(product.getRating()));
    }

    /**
     * Feature: ai-rag-enhanced-chat, Property 21: Catalog change triggers re-embedding
     * Validates: Requirements 2.5, 9.2
     *
     * For any broadband plan, the content string built for embedding shall contain
     * all required plan fields: name, download speed, upload speed, technology type,
     * contract length, monthly price.
     */
    @Property(tries = 100)
    void broadbandEmbeddingContentReflectsAllFields(@ForAll("broadbandPlans") BroadbandPlan plan) {
        IngestionService ingestionService = new IngestionService(null, null, null);
        String content = ingestionService.buildBroadbandContent(plan);

        assertThat(content).contains(plan.getName());
        assertThat(content).contains(String.valueOf(plan.getDownloadSpeedMbps()));
        assertThat(content).contains(String.valueOf(plan.getUploadSpeedMbps()));
        assertThat(content).contains(plan.getTechnologyType());
        assertThat(content).contains(String.valueOf(plan.getContractLengthMonths()));
        assertThat(content).contains(String.format("%.2f", plan.getMonthlyPrice()));
    }
}
