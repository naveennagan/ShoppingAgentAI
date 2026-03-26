package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IngestionResult {
    private int totalIngested;
    private int failures;
    private Instant timestamp;
    private List<String> failedSourceIds;
}
