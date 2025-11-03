package settings

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// Settings captures the configuration required to communicate with an OpenAI compatible API.
type Settings struct {
	APIBaseURL            string `json:"apiBaseUrl"`
	APIKey                string `json:"apiKey"`
	Model                 string `json:"model"`
	Organization          string `json:"organization,omitempty"`
	Language              string `json:"language"`
	DesktopCaptureEnabled bool   `json:"desktopCaptureEnabled"`
	ActivityLogging       bool   `json:"activityLogging"`
}

// DefaultSettings returns a Settings instance populated with secure defaults.
func DefaultSettings() Settings {
	return Settings{
		APIBaseURL:            "https://api.openai.com/v1",
		APIKey:                "",
		Model:                 "gpt-4o-mini",
		Organization:          "",
		Language:              "en",
		DesktopCaptureEnabled: false,
		ActivityLogging:       true,
	}
}

// Store provides concurrency safe persistence for settings on disk.
type Store struct {
	path string
	mu   sync.RWMutex
}

// NewStore creates a new settings store rooted in the user's configuration directory.
func NewStore(appName string) (*Store, error) {
	if appName == "" {
		return nil, errors.New("app name must not be empty")
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("resolve config dir: %w", err)
	}

	basePath := filepath.Join(configDir, appName)
	if err := os.MkdirAll(basePath, 0o700); err != nil {
		return nil, fmt.Errorf("create config dir: %w", err)
	}

	return &Store{path: filepath.Join(basePath, "settings.json")}, nil
}

// Load retrieves settings from disk or returns defaults when the configuration file is absent.
func (s *Store) Load() (Settings, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if _, err := os.Stat(s.path); errors.Is(err, os.ErrNotExist) {
		return DefaultSettings(), nil
	}

	data, err := os.ReadFile(s.path)
	if err != nil {
		return Settings{}, fmt.Errorf("read settings: %w", err)
	}

	var cfg Settings
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Settings{}, fmt.Errorf("parse settings: %w", err)
	}

	return cfg, nil
}

// Save persists the provided settings to disk using 0600 permissions.
func (s *Store) Save(cfg Settings) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("encode settings: %w", err)
	}

	if err := os.WriteFile(s.path, data, 0o600); err != nil {
		return fmt.Errorf("write settings: %w", err)
	}

	return nil
}

// Path exposes the current path of the settings file. Useful for diagnostics.
func (s *Store) Path() string {
	return s.path
}
