package com.shoppingagent.service;

import com.shoppingagent.exception.SupabaseConnectionException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class SupabaseClient {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    private HttpClient httpClient;

    @PostConstruct
    public void init() {
        if (supabaseUrl == null || supabaseUrl.isBlank()) {
            throw new IllegalStateException("Missing required configuration: supabase.url");
        }
        if (supabaseKey == null || supabaseKey.isBlank()) {
            throw new IllegalStateException("Missing required configuration: supabase.key");
        }
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * GET request to the Supabase PostgREST API.
     *
     * @param table       the table name
     * @param queryParams PostgREST query string (e.g., "select=*&category=eq.Mobile"), or empty string
     * @return the JSON response body
     */
    public String get(String table, String queryParams) {
        String url = buildUrl(table, queryParams);
        HttpRequest request = baseRequest(url)
                .GET()
                .build();
        return execute(request);
    }

    /**
     * POST request to insert rows.
     *
     * @param table    the table name
     * @param jsonBody JSON body to insert
     * @return the JSON response body
     */
    public String post(String table, String jsonBody) {
        String url = buildUrl(table, "");
        HttpRequest request = baseRequest(url)
                .header("Prefer", "return=representation")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        return execute(request);
    }

    /**
     * PATCH request to update rows matching the query.
     *
     * @param table       the table name
     * @param queryParams PostgREST filter (e.g., "id=eq.some-uuid")
     * @param jsonBody    JSON body with fields to update
     * @return the JSON response body
     */
    public String patch(String table, String queryParams, String jsonBody) {
        String url = buildUrl(table, queryParams);
        HttpRequest request = baseRequest(url)
                .header("Prefer", "return=representation")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        return execute(request);
    }

    /**
     * DELETE request to remove rows matching the query.
     *
     * @param table       the table name
     * @param queryParams PostgREST filter (e.g., "session_id=eq.abc123")
     * @return the JSON response body
     */
    public String delete(String table, String queryParams) {
        String url = buildUrl(table, queryParams);
        HttpRequest request = baseRequest(url)
                .DELETE()
                .build();
        return execute(request);
    }

    private String buildUrl(String table, String queryParams) {
        String base = supabaseUrl.endsWith("/") ? supabaseUrl : supabaseUrl + "/";
        String url = base + "rest/v1/" + table;
        if (queryParams != null && !queryParams.isBlank()) {
            url += "?" + queryParams;
        }
        return url;
    }

    private HttpRequest.Builder baseRequest(String url) {
        return HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("apikey", supabaseKey)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("Content-Type", "application/json");
    }

    private String execute(HttpRequest request) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.body();
        } catch (IOException e) {
            throw new SupabaseConnectionException("Failed to connect to Supabase: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new SupabaseConnectionException("Supabase request interrupted: " + e.getMessage(), e);
        }
    }
}
