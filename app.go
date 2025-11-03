package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
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
	session       SessionState
}

// Overview represents quick insights about the desktop copilot health state.
type Overview struct {
	SettingsPath          string                `json:"settingsPath"`
	DesktopCaptureEnabled bool                  `json:"desktopCaptureEnabled"`
	ActivityLogging       bool                  `json:"activityLogging"`
	ActiveLanguage        string                `json:"activeLanguage"`
	LastRefresh           string                `json:"lastRefresh"`
	ActivitySample        []activity.Event      `json:"activitySample"`
	ConnectionStatus      *llm.ConnectionStatus `json:"connectionStatus"`
}

// AccountProfile summarizes the authenticated user's profile information.
type AccountProfile struct {
	DisplayName string `json:"displayName"`
	Email       string `json:"email,omitempty"`
	AvatarURL   string `json:"avatarUrl,omitempty"`
	AvatarData  string `json:"avatarData,omitempty"`
	LastLogin   string `json:"lastLogin,omitempty"`
}

// SessionState captures the authentication status for the desktop app.
type SessionState struct {
	Authenticated bool            `json:"authenticated"`
	Profile       *AccountProfile `json:"profile,omitempty"`
}

// LoginRequest carries the credentials used to initiate a local session.
type LoginRequest struct {
	Username string `json:"username"`
	Email    string `json:"email,omitempty"`
	Password string `json:"password"`
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
		session:       SessionState{Authenticated: false},
	}
}

func (a *App) profileFromSettings(lastLogin string) *AccountProfile {
	cfg := a.currentConfig

	if cfg.DisplayName == "" && cfg.AccountEmail == "" && cfg.AvatarURL == "" && cfg.AvatarData == "" {
		if lastLogin == "" {
			return nil
		}

		return &AccountProfile{LastLogin: lastLogin}
	}

	profile := &AccountProfile{
		DisplayName: cfg.DisplayName,
		Email:       cfg.AccountEmail,
		AvatarURL:   cfg.AvatarURL,
		AvatarData:  cfg.AvatarData,
		LastLogin:   lastLogin,
	}

	return profile
}

func (a *App) refreshSessionProfile(lastLogin string) {
	loginTimestamp := lastLogin
	if loginTimestamp == "" && a.session.Profile != nil {
		loginTimestamp = a.session.Profile.LastLogin
	}

	if !a.session.Authenticated {
		a.session.Profile = a.profileFromSettings(loginTimestamp)
		return
	}

	a.session.Profile = &AccountProfile{
		DisplayName: a.currentConfig.DisplayName,
		Email:       a.currentConfig.AccountEmail,
		AvatarURL:   a.currentConfig.AvatarURL,
		AvatarData:  a.currentConfig.AvatarData,
		LastLogin:   loginTimestamp,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	if a.settingsStore == nil {
		a.refreshSessionProfile("")
		return
	}

	cfg, err := a.settingsStore.Load()
	if err != nil {
		fmt.Println("warning: unable to load settings:", err)
		return
	}

	a.currentConfig = cfg
	a.refreshSessionProfile("")
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
	a.refreshSessionProfile("")

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
	now := time.Now()
	sample := activity.SampleFeed(now)

	status, err := llm.Probe(context.Background(), a.currentConfig)
	if err != nil {
		status = &llm.ConnectionStatus{Healthy: false, Message: err.Error()}
	}

	overview := &Overview{
		SettingsPath:          "",
		DesktopCaptureEnabled: a.currentConfig.DesktopCaptureEnabled,
		ActivityLogging:       a.currentConfig.ActivityLogging,
		ActiveLanguage:        a.currentConfig.Language,
		LastRefresh:           now.Format(time.RFC3339Nano),
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

// GetSession returns the current authentication session state.
func (a *App) GetSession() *SessionState {
	a.refreshSessionProfile("")
	state := a.session
	return &state
}

// Login begins a local session after validating input credentials.
func (a *App) Login(req LoginRequest) (*SessionState, error) {
	username := strings.TrimSpace(req.Username)
	password := strings.TrimSpace(req.Password)

	if username == "" || password == "" {
		return nil, errors.New("username and password are required")
	}

	if req.Email != "" {
		a.currentConfig.AccountEmail = strings.TrimSpace(req.Email)
	}

	a.currentConfig.DisplayName = username
	a.session.Authenticated = true

	loginTime := time.Now().Format(time.RFC3339Nano)
	a.refreshSessionProfile(loginTime)

	return a.GetSession(), nil
}

// Logout clears the active session information.
func (a *App) Logout() (*SessionState, error) {
	lastLogin := ""
	if a.session.Profile != nil {
		lastLogin = a.session.Profile.LastLogin
	}

	a.session.Authenticated = false
	a.refreshSessionProfile(lastLogin)

	state := a.session
	return &state, nil
}
