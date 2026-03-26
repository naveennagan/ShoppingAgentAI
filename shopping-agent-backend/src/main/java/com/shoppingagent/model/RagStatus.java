package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RagStatus {
    private long totalDocuments;
    private Instant lastIngestionTimestamp;
    private int pendingQueueItems;
}
