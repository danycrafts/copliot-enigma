export interface SettingsPayload {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  organization?: string;
  language: string;
  desktopCaptureEnabled: boolean;
  activityLogging: boolean;
}

export interface ConnectionStatus {
  healthy: boolean;
  message: string;
}

export interface ActivityEvent {
  id: string;
  category: string;
  description: string;
  timestamp: string;
  confidence: number;
}

export interface Overview {
  settingsPath: string;
  desktopCaptureEnabled: boolean;
  activityLogging: boolean;
  activeLanguage: string;
  lastRefresh: string;
  activitySample: ActivityEvent[];
  connectionStatus?: ConnectionStatus | null;
}
