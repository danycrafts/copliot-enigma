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
  avatarData?: string;
  accountEmail?: string;
  preferredLLMVendor?: string;
  requestTimeoutSeconds?: number;
  maxRetries?: number;
  networkProxy?: string;
  allowUntrustedCertificates?: boolean;
  automationBrowser: string;
  browserProfilePath?: string;
  backgroundAutomation: boolean;
}

export interface AccountProfile {
  displayName: string;
  email?: string;
  avatarUrl?: string;
  avatarData?: string;
  lastLogin?: string;
}

export interface AuthSession {
  authenticated: boolean;
  profile?: AccountProfile | null;
}

export interface LoginRequest {
  username: string;
  email?: string;
  password: string;
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
