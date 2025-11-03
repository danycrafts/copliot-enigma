export interface SettingsPayload {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  organization?: string;
  language: string;
  desktopCaptureEnabled: boolean;
  activityLogging: boolean;
  displayName?: string;
  avatarUrl?: string;
  preferredLLMVendor?: string;
  requestTimeoutSeconds?: number;
  maxRetries?: number;
  networkProxy?: string;
  allowUntrustedCertificates?: boolean;
  automationBrowser: string;
  browserProfilePath?: string;
  backgroundAutomation: boolean;
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
