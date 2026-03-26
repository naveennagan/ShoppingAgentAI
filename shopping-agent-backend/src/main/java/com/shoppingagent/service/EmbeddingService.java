package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.shoppingagent.exception.EmbeddingException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class EmbeddingService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.embedding.model:gemini-embedding-001}")
    private String embeddingModel;

    private final Gson gson = new Gson();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public float[] generateEmbedding(String text) {
        try {
            String url = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent?key=%s",
                    embeddingModel, apiKey);

            JsonObject contentPart = new JsonObject();
            contentPart.addProperty("text", text);

            JsonArray partsArray = new JsonArray();
            partsArray.add(contentPart);

            JsonObject content = new JsonObject();
            content.add("parts", partsArray);

            JsonObject requestBody = new JsonObject();
            requestBody.addProperty("model", "models/" + embeddingModel);
            requestBody.add("content", content);
            requestBody.addProperty("output_dimensionality", 768);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(requestBody)))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new EmbeddingException(
                        "Embedding API returned status " + response.statusCode() + ": " + response.body(),
                        response.statusCode(),
                        response.body());
            }

            JsonObject responseJson = gson.fromJson(response.body(), JsonObject.class);
            JsonArray values = responseJson.getAsJsonObject("embedding").getAsJsonArray("values");

            float[] embedding = new float[values.size()];
            for (int i = 0; i < values.size(); i++) {
                embedding[i] = values.get(i).getAsFloat();
            }

            return embedding;
        } catch (EmbeddingException e) {
            throw e;
        } catch (Exception e) {
            throw new EmbeddingException("Failed to generate embedding: " + e.getMessage(), e);
        }
    }
}
