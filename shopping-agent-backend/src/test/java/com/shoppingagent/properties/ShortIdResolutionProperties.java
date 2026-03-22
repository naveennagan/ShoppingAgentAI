package com.shoppingagent.properties;

import com.shoppingagent.model.ChatResponse;
import com.shoppingagent.model.RagContext;
import com.shoppingagent.model.SummaryCard;
import com.shoppingagent.controller.ChatController;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;

import java.lang.reflect.Method;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Feature: ai-rag-enhanced-chat, Property 11: Short ID resolution
 * Validates: Requirements 4.4
 *
 * For any chat response containing short IDs (p0, p1, ...) in actions,
 * suggestions, or summary cards, all short IDs shall be resolved to valid
 * UUIDs that correspond to real products or broadband plans.
 */
class ShortIdResolutionProperties {

    private static final Pattern UUID_PATTERN =
            Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
    private static final Pattern SHORT_ID_PATTERN = Pattern.compile("\\bp\\d+\\b");

    private void invokeResolveShortIds(ChatResponse response, RagContext ragContext) throws Exception {
        ChatController controller = new ChatController(null, null);
        Method method = ChatController.class.getDeclaredMethod("resolveShortIds", ChatResponse.class, RagContext.class);
        method.setAccessible(true);
        method.invoke(controller, response, ragContext);
    }

    // -------------------------------------------------------------------------
    // Arbitraries
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<List<String>> sourceIdLists() {
        return Arbitraries.integers().between(1, 10)
                .map(size -> IntStream.range(0, size)
                        .mapToObj(i -> UUID.randomUUID().toString())
                        .collect(Collectors.toList()));
    }

    // -------------------------------------------------------------------------
    // Property 11: Short ID resolution — payload
    // -------------------------------------------------------------------------

    /**
     * Feature: ai-rag-enhanced-chat, Property 11: Short ID resolution
     * Validates: Requirements 4.4
     *
     * For any payload containing short IDs pN where N is a valid index into
     * sourceIds, resolveShortIds shall replace each pN with the UUID at sourceIds[N].
     */
    @Property(tries = 100)
    void payloadShortIdsResolvedToValidUuids(
            @ForAll("sourceIdLists") List<String> sourceIds
    ) throws Exception {
        // Build a payload referencing all source IDs via short IDs
        String payload = IntStream.range(0, sourceIds.size())
                .mapToObj(i -> "p" + i)
                .collect(Collectors.joining(","));

        ChatResponse response = new ChatResponse("add_to_cart", payload, "Here are your items");
        RagContext ragContext = new RagContext("context", sourceIds, sourceIds.size());

        invokeResolveShortIds(response, ragContext);

        // After resolution, no short IDs should remain
        assertThat(SHORT_ID_PATTERN.matcher(response.getPayload()).find())
                .as("Payload should contain no unresolved short IDs")
                .isFalse();

        // Each resolved ID should be a valid UUID from the sourceIds list
        String[] resolvedIds = response.getPayload().split(",");
        for (String resolvedId : resolvedIds) {
            assertThat(UUID_PATTERN.matcher(resolvedId).matches())
                    .as("Resolved ID '%s' should be a valid UUID", resolvedId)
                    .isTrue();
            assertThat(sourceIds).contains(resolvedId);
        }
    }

    /**
     * Feature: ai-rag-enhanced-chat, Property 11: Short ID resolution
     * Validates: Requirements 4.4
     *
     * For any summary card whose id is a short ID pN, resolveShortIds shall
     * replace it with the UUID at sourceIds[N].
     */
    @Property(tries = 100)
    void summaryCardShortIdsResolvedToValidUuids(
            @ForAll("sourceIdLists") List<String> sourceIds
    ) throws Exception {
        List<SummaryCard> cards = new ArrayList<>();
        for (int i = 0; i < sourceIds.size(); i++) {
            SummaryCard card = new SummaryCard();
            card.setType(i % 2 == 0 ? "product" : "broadband");
            card.setId("p" + i);
            card.setName("Item " + i);
            cards.add(card);
        }

        ChatResponse response = new ChatResponse();
        response.setMessage("Recommendations");
        response.setSummaryCards(cards);
        RagContext ragContext = new RagContext("context", sourceIds, sourceIds.size());

        invokeResolveShortIds(response, ragContext);

        for (int i = 0; i < cards.size(); i++) {
            String resolvedId = cards.get(i).getId();
            assertThat(UUID_PATTERN.matcher(resolvedId).matches())
                    .as("Summary card %d id '%s' should be a valid UUID", i, resolvedId)
                    .isTrue();
            assertThat(resolvedId).isEqualTo(sourceIds.get(i));
        }
    }

    /**
     * Feature: ai-rag-enhanced-chat, Property 11: Short ID resolution
     * Validates: Requirements 4.4
     *
     * When RagContext is null, short IDs in the response shall remain unchanged.
     */
    @Property(tries = 100)
    void nullRagContextLeavesShortIdsUnchanged(
            @ForAll @IntRange(min = 0, max = 9) int index
    ) throws Exception {
        String shortId = "p" + index;
        ChatResponse response = new ChatResponse("add_to_cart", shortId, "message");

        invokeResolveShortIds(response, null);

        assertThat(response.getPayload()).isEqualTo(shortId);
    }

    /**
     * Feature: ai-rag-enhanced-chat, Property 11: Short ID resolution
     * Validates: Requirements 4.4
     *
     * Short IDs with an index beyond the sourceIds list size shall remain
     * unresolved without throwing an error.
     */
    @Property(tries = 100)
    void outOfBoundsShortIdsRemainUnresolved(
            @ForAll("sourceIdLists") List<String> sourceIds
    ) throws Exception {
        int outOfBoundsIndex = sourceIds.size() + 5;
        String shortId = "p" + outOfBoundsIndex;

        ChatResponse response = new ChatResponse("add_to_cart", shortId, "message");
        RagContext ragContext = new RagContext("context", sourceIds, sourceIds.size());

        invokeResolveShortIds(response, ragContext);

        assertThat(response.getPayload()).isEqualTo(shortId);
    }

    /**
     * Feature: ai-rag-enhanced-chat, Property 11: Short ID resolution
     * Validates: Requirements 4.4
     *
     * For any payload mixing short IDs and plain text, only the short IDs
     * shall be replaced while surrounding text remains intact.
     */
    @Property(tries = 100)
    void mixedContentPayloadResolvesOnlyShortIds(
            @ForAll("sourceIdLists") List<String> sourceIds
    ) throws Exception {
        String payload = "Add item p0 to cart";
        ChatResponse response = new ChatResponse("add_to_cart", payload, "message");
        RagContext ragContext = new RagContext("context", sourceIds, sourceIds.size());

        invokeResolveShortIds(response, ragContext);

        String expected = "Add item " + sourceIds.get(0) + " to cart";
        assertThat(response.getPayload()).isEqualTo(expected);
    }
}
