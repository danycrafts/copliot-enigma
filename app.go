package main

import (
	"context"
	"fmt"
	"time"

	"copilot-enigma/internal/activity"
	"copilot-enigma/internal/llm"
	"copilot-enigma/internal/settings"
)

// App struct
type App struct {
	ctx           context.Context
	settingsStore *settings.Store
	currentConfig settings.Settings
}

// Overview represents quick insights about the desktop copilot health state.
type Overview struct {
	SettingsPath          string                `json:"settingsPath"`
	DesktopCaptureEnabled bool                  `json:"desktopCaptureEnabled"`
	ActivityLogging       bool                  `json:"activityLogging"`
	ActiveLanguage        string                `json:"activeLanguage"`
	LastRefresh           time.Time             `json:"lastRefresh"`
	ActivitySample        []activity.Event      `json:"activitySample"`
	ConnectionStatus      *llm.ConnectionStatus `json:"connectionStatus"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	store, err := settings.NewStore("copilot-enigma")
	if err != nil {
		fmt.Println("warning: falling back to in-memory settings store:", err)
	}

	return &App{
		settingsStore: store,
		currentConfig: settings.DefaultSettings(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	if a.settingsStore == nil {
		return
	}

	cfg, err := a.settingsStore.Load()
	if err != nil {
		fmt.Println("warning: unable to load settings:", err)
		return
	}

	a.currentConfig = cfg
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// GetSettings returns the cached configuration for the frontend to display.
func (a *App) GetSettings() settings.Settings {
	return a.currentConfig
}

// SaveSettings persists configuration and updates the cached copy.
func (a *App) SaveSettings(cfg settings.Settings) (settings.Settings, error) {
	a.currentConfig = cfg

	if a.settingsStore == nil {
		return cfg, nil
	}

	if err := a.settingsStore.Save(cfg); err != nil {
		return cfg, err
	}

	return cfg, nil
}

// TestLLMConnection validates settings against an OpenAI compatible API server.
func (a *App) TestLLMConnection(cfg settings.Settings) (*llm.ConnectionStatus, error) {
	baseCtx := a.ctx
	if baseCtx == nil {
		baseCtx = context.Background()
	}

	ctx, cancel := context.WithTimeout(baseCtx, 20*time.Second)
	defer cancel()

	status, err := llm.Probe(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return status, nil
}

// GetOverview composes a summary of the current system status.
func (a *App) GetOverview() (*Overview, error) {
	sample := activity.SampleFeed(time.Now())

	status, err := llm.Probe(context.Background(), a.currentConfig)
	if err != nil {
		status = &llm.ConnectionStatus{Healthy: false, Message: err.Error()}
	}

	overview := &Overview{
		SettingsPath:          "",
		DesktopCaptureEnabled: a.currentConfig.DesktopCaptureEnabled,
		ActivityLogging:       a.currentConfig.ActivityLogging,
		ActiveLanguage:        a.currentConfig.Language,
		LastRefresh:           time.Now(),
		ActivitySample:        sample,
		ConnectionStatus:      status,
	}

	if a.settingsStore != nil {
		overview.SettingsPath = a.settingsStore.Path()
	}

	return overview, nil
}

// GetRecentActivity returns desktop observations currently cached on the backend.
func (a *App) GetRecentActivity() ([]activity.Event, error) {
	return activity.SampleFeed(time.Now()), nil
}
