package llm

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
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

	timeout := requestTimeout
	if cfg.RequestTimeoutSeconds > 0 {
		timeout = time.Duration(cfg.RequestTimeoutSeconds) * time.Second
	}

	var transport *http.Transport
	if cfg.NetworkProxy != "" || cfg.AllowUntrustedCerts {
		transport = &http.Transport{}

		if cfg.NetworkProxy != "" {
			proxyURL, err := url.Parse(cfg.NetworkProxy)
			if err != nil {
				return &ConnectionStatus{Healthy: false, Message: fmt.Sprintf("invalid proxy url: %v", err)}, nil
			}
			transport.Proxy = http.ProxyURL(proxyURL)
		}

		if cfg.AllowUntrustedCerts {
			transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} //nolint:gosec
		}
	}

	attempts := cfg.MaxRetries
	if attempts < 1 {
		attempts = 1
	}

	var lastStatus *ConnectionStatus

	for attempt := 0; attempt < attempts; attempt++ {
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
		if cfg.PreferredLLMVendor != "" {
			req.Header.Set("X-LLM-Vendor", cfg.PreferredLLMVendor)
		}

		client := &http.Client{Timeout: timeout}
		if transport != nil {
			client.Transport = transport
		}

		resp, err := client.Do(req)
		if err != nil {
			lastStatus = &ConnectionStatus{Healthy: false, Message: err.Error()}
			continue
		}

		func() {
			defer resp.Body.Close()

			if resp.StatusCode >= http.StatusBadRequest {
				lastStatus = &ConnectionStatus{Healthy: false, Message: fmt.Sprintf("llm server responded with status %d", resp.StatusCode)}
				return
			}

			var responsePayload map[string]any
			if err := json.NewDecoder(resp.Body).Decode(&responsePayload); err != nil {
				lastStatus = &ConnectionStatus{Healthy: true, Message: "Connected successfully, but failed to decode response"}
				return
			}

			lastStatus = &ConnectionStatus{Healthy: true, Message: "Connection successful"}
		}()

		if lastStatus != nil && lastStatus.Healthy {
			return lastStatus, nil
		}
	}

	if lastStatus == nil {
		lastStatus = &ConnectionStatus{Healthy: false, Message: "connection attempt did not return a status"}
	}

	return lastStatus, nil
}
