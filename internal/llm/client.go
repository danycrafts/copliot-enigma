package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"copilot-enigma/internal/settings"
)

// ConnectionStatus conveys the result of probing an LLM server.
type ConnectionStatus struct {
	Healthy bool   `json:"healthy"`
	Message string `json:"message"`
}

const (
	modelsEndpoint = "/models"
	requestTimeout = 15 * time.Second
)

// Probe verifies that an OpenAI compatible LLM server is reachable and responsive.
func Probe(ctx context.Context, cfg settings.Settings) (*ConnectionStatus, error) {
	if cfg.APIBaseURL == "" {
		return &ConnectionStatus{Healthy: false, Message: "API base URL is required"}, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimSuffix(cfg.APIBaseURL, "/")+modelsEndpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	if cfg.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	}
	if cfg.Organization != "" {
		req.Header.Set("OpenAI-Organization", cfg.Organization)
	}

	client := &http.Client{Timeout: requestTimeout}

	resp, err := client.Do(req)
	if err != nil {
		return &ConnectionStatus{Healthy: false, Message: err.Error()}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return &ConnectionStatus{Healthy: false, Message: fmt.Sprintf("llm server responded with status %d", resp.StatusCode)}, nil
	}

	var responsePayload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&responsePayload); err != nil {
		return &ConnectionStatus{Healthy: true, Message: "Connected successfully, but failed to decode response"}, nil
	}

	return &ConnectionStatus{Healthy: true, Message: "Connection successful"}, nil
}
