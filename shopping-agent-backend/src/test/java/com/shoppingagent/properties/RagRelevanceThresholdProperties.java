package com.shoppingagent.properties;

import com.shoppingagent.model.KnowledgeDocument;
import com.shoppingagent.model.RagContext;
import com.shoppingagent.service.RagService;
import net.jqwik.api.*;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Feature: ai-rag-enhanced-chat, Property 6: Relevance threshold filtering
 * Validates: Requirements 3.3, 8.2
 *
 * For any set of documents returned by the RAG pipeline's context assembly,
 * every document shall have a relevance score greater than or equal to the
 * configured threshold.
 */
class RagRelevanceThresholdProperties {

    private RagService buildRagService(double threshold, int maxContextTokens) throws Exception {
        RagService service = new RagService(null, null);

        Field thresholdField = RagService.class.getDeclaredField("relevanceThreshold");
        thresholdField.setAccessible(true);
        thresholdField.set(service, threshold);

        Field maxTokensField = RagService.class.getDeclaredField("maxContextTokens");
        maxTokensField.setAccessible(true);
        maxTokensField.set(service, maxContextTokens);

        return service;
    }

    private RagContext invokeAssembleContext(RagService service, List<KnowledgeDocument> docs) throws Exception {
        Method method = RagService.class.getDeclaredMethod("assembleContext", List.class);
        method.setAccessible(true);
        return (RagContext) method.invoke(service, docs);
    }

    // -------------------------------------------------------------------------
    // Arbitraries
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<String> sourceTypes() {
        return Arbitraries.of("product", "broadband_plan");
    }

    private KnowledgeDocument createDoc(String content, String sourceType, double score) {
        KnowledgeDocument doc = new KnowledgeDocument();
        doc.setId(UUID.randomUUID().toString());
        doc.setContent(content);
        doc.setRelevanceScore(score);
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("source_type", sourceType);
        metadata.put("source_id", UUID.randomUUID().toString());
        doc.setMetadata(metadata);
        doc.setCreatedAt(Instant.now());
        return doc;
    }

    @Provide
    Arbitrary<Double> thresholds() {
        return Arbitraries.doubles().between(0.1, 0.9);
    }

    @Provide
    Arbitrary<Double> aboveScores() {
        return Arbitraries.doubles().between(0.0, 1.0);
    }

    @Provide
    Arbitrary<List<Double>> mixedScoreLists() {
        return Arbitraries.doubles().between(0.0, 1.0)
                .list().ofMinSize(1).ofMaxSize(12);
    }

    // -------------------------------------------------------------------------
    // Property 6: Relevance threshold filtering
    // -------------------------------------------------------------------------

    /**
     * Feature: ai-rag-enhanced-chat, Property 6: Relevance threshold filtering
     * Validates: Requirements 3.3, 8.2
     *
     * Given a mixed list of documents with varying relevance scores and a
     * configurable threshold, assembleContext shall only include documents
     * whose relevance score is >= the threshold.
     */
    @Property(tries = 100)
    void allDocumentsInContextMeetRelevanceThreshold(
            @ForAll("thresholds") double threshold,
            @ForAll("mixedScoreLists") List<Double> scores
    ) throws Exception {
        RagService service = buildRagService(threshold, 50000);

        // Build documents with unique content strings (UUID-based to avoid substring collisions)
        List<KnowledgeDocument> documents = new ArrayList<>();
        for (int i = 0; i < scores.size(); i++) {
            String sourceType = i % 2 == 0 ? "product" : "broadband_plan";
            String uniqueContent = "DOC_" + UUID.randomUUID().toString();
            documents.add(createDoc(uniqueContent, sourceType, scores.get(i)));
        }

        RagContext context = invokeAssembleContext(service, documents);

        if (context == null) {
            // All documents were below threshold — valid outcome
            boolean allBelow = scores.stream().allMatch(s -> s < threshold);
            assertThat(allBelow)
                    .as("Context is null but some documents had score >= threshold")
                    .isTrue();
            return;
        }

        // Every document whose content appears in the context must have score >= threshold
        for (KnowledgeDocument doc : documents) {
            if (context.getContextWindow().contains(doc.getContent())) {
                assertThat(doc.getRelevanceScore())
                        .as("Document '%s' with score %.4f must be >= threshold %.4f",
                                doc.getContent(), doc.getRelevanceScore(), threshold)
                        .isGreaterThanOrEqualTo(threshold);
            }
        }

        // No below-threshold document content should appear in the context
        for (KnowledgeDocument doc : documents) {
            if (doc.getRelevanceScore() < threshold) {
                assertThat(context.getContextWindow())
                        .as("Below-threshold document (score %.4f) should not be in context",
                                doc.getRelevanceScore())
                        .doesNotContain(doc.getContent());
            }
        }
    }

    /**
     * Feature: ai-rag-enhanced-chat, Property 6: Relevance threshold filtering (boundary)
     * Validates: Requirements 3.3, 8.2
     *
     * Documents with relevance score exactly equal to the threshold
     * shall be included in the context.
     */
    @Property(tries = 100)
    void documentsAtExactThresholdAreIncluded(
            @ForAll("thresholds") double threshold
    ) throws Exception {
        RagService service = buildRagService(threshold, 50000);

        KnowledgeDocument exactDoc = createDoc("Exact threshold document", "product", threshold);
        List<KnowledgeDocument> docs = List.of(exactDoc);

        RagContext context = invokeAssembleContext(service, docs);

        assertThat(context).isNotNull();
        assertThat(context.getDocumentCount()).isEqualTo(1);
        assertThat(context.getContextWindow()).contains("Exact threshold document");
    }

    /**
     * Feature: ai-rag-enhanced-chat, Property 6: Relevance threshold filtering (count invariant)
     * Validates: Requirements 3.3, 8.2
     *
     * The document count in the assembled context shall equal the number of
     * input documents with score >= threshold (minus any removed by token truncation).
     */
    @Property(tries = 100)
    void contextDocCountMatchesAboveThresholdCount(
            @ForAll("thresholds") double threshold,
            @ForAll("mixedScoreLists") List<Double> scores
    ) throws Exception {
        RagService service = buildRagService(threshold, 50000);

        List<KnowledgeDocument> documents = new ArrayList<>();
        for (int i = 0; i < scores.size(); i++) {
            String sourceType = i % 2 == 0 ? "product" : "broadband_plan";
            String uniqueContent = "ITEM_" + UUID.randomUUID().toString();
            documents.add(createDoc(uniqueContent, sourceType, scores.get(i)));
        }

        long expectedAboveThreshold = scores.stream().filter(s -> s >= threshold).count();

        RagContext context = invokeAssembleContext(service, documents);

        if (expectedAboveThreshold == 0) {
            assertThat(context).isNull();
        } else {
            assertThat(context).isNotNull();
            // With a large token limit, all above-threshold docs should be included
            assertThat(context.getDocumentCount())
                    .as("Context should contain exactly the above-threshold documents")
                    .isEqualTo((int) expectedAboveThreshold);
        }
    }
}
