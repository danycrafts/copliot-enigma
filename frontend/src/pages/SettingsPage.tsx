import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SaveIcon from '@mui/icons-material/Save';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import UploadIcon from '@mui/icons-material/Upload';
import {
  Avatar,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import {
  GetSettings,
  SaveSettings,
  TestLLMConnection
} from '../../wailsjs/go/main/App';
import type { ConnectionStatus, SettingsPayload } from '../types';
import type { ChangeEvent } from 'react';

const languageOptions = ['en', 'es', 'de'] as const;
const llmVendors = ['openai', 'azure', 'local'] as const;
const browserOptions = ['chromium', 'chrome', 'edge', 'firefox'] as const;

const defaultSettings: SettingsPayload = {
  apiBaseUrl: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  organization: '',
  language: 'en',
  desktopCaptureEnabled: false,
  activityLogging: true,
  displayName: '',
  avatarUrl: '',
  avatarData: '',
  accountEmail: '',
  preferredLLMVendor: 'openai',
  requestTimeoutSeconds: 15,
  maxRetries: 2,
  networkProxy: '',
  allowUntrustedCertificates: false,
  automationBrowser: 'chromium',
  browserProfilePath: '',
  backgroundAutomation: false
};

export const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<SettingsPayload>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(true);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await GetSettings();
        setSettings({ ...defaultSettings, ...response });
        if (response.language) {
          void i18n.changeLanguage(response.language);
        }
      } catch (err) {
        setSnackbar({ message: err instanceof Error ? err.message : String(err), severity: 'error' });
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();
  }, [i18n]);

  const updateSetting = <K extends keyof SettingsPayload>(key: K, value: SettingsPayload[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (key: keyof SettingsPayload) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = event.currentTarget;
    const value =
      target.type === 'checkbox'
        ? ((target as HTMLInputElement).checked as SettingsPayload[typeof key])
        : ((target.value as unknown) as SettingsPayload[typeof key]);
    updateSetting(key, value);
    if (key === 'language') {
      void i18n.changeLanguage(String(value));
    }
  };

  const handleSelectChange = (key: keyof SettingsPayload) => (event: SelectChangeEvent<string>) => {
    const { value } = event.target as typeof event.target & { value: string };
    updateSetting(key, value as SettingsPayload[typeof key]);
    if (key === 'language') {
      void i18n.changeLanguage(value);
    }
  };

  const handleNumberChange = (key: keyof SettingsPayload) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    const numericValue = Number(value);
    setSettings((prev) => ({
      ...prev,
      [key]: (Number.isNaN(numericValue) ? prev[key] : numericValue) as SettingsPayload[typeof key]
    }));
  };

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSettings((prev) => ({ ...prev, avatarData: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  };

  const handleAvatarClear = () => {
    setSettings((prev) => ({ ...prev, avatarData: '' }));
  };

  const handleSave = async () => {
    try {
      const result = await SaveSettings(settings);
      setSettings(result);
      setSnackbar({ message: t('app.notifications.settingsSaved'), severity: 'success' });
    } catch (err) {
      setSnackbar({ message: err instanceof Error ? err.message : String(err), severity: 'error' });
    }
  };

  const handleTestConnection = async () => {
    if (!settings.apiBaseUrl) {
      setSnackbar({ message: t('settings.prompts.missingBaseUrl'), severity: 'error' });
      return;
    }

    try {
      const status = await TestLLMConnection(settings);
      setConnectionStatus(status);
      setSnackbar({
        message: status.healthy ? t('app.notifications.connectionSuccess') : t('app.notifications.connectionFailed'),
        severity: status.healthy ? 'success' : 'error'
      });
    } catch (err) {
      setSnackbar({ message: err instanceof Error ? err.message : String(err), severity: 'error' });
    }
  };

  const connectionLabel = useMemo(() => {
    if (!connectionStatus) {
      return null;
    }

    return (
      <Alert severity={connectionStatus.healthy ? 'success' : 'warning'} sx={{ mt: 2 }}>
        {connectionStatus.message}
      </Alert>
    );
  }, [connectionStatus]);

  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('settings.title')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('settings.description')}</Typography>
        </Box>

        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <AccountCircleIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">{t('settings.sections.account.title')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('settings.sections.account.description')}</Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Avatar
              src={settings.avatarData || settings.avatarUrl}
              alt={settings.displayName ?? ''}
              sx={{ width: 96, height: 96 }}
            >
              <AccountCircleIcon fontSize="large" />
            </Avatar>
            <Stack spacing={1} width="100%">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={handleAvatarUpload}
                  disabled={loading}
                >
                  {t('settings.actions.uploadAvatar')}
                </Button>
                {settings.avatarData ? (
                  <Button onClick={handleAvatarClear} disabled={loading}>
                    {t('settings.actions.clearAvatar')}
                  </Button>
                ) : null}
              </Stack>
              <Typography variant="caption" color="text.secondary">{t('settings.hints.avatarUpload')}</Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarFileChange}
              />
            </Stack>
          </Stack>

          <TextField
            label={t('settings.fields.displayName')}
            value={settings.displayName ?? ''}
            onChange={handleInputChange('displayName')}
            helperText={t('settings.hints.displayName')}
            disabled={loading}
            fullWidth
          />
          <TextField
            label={t('settings.fields.accountEmail')}
            value={settings.accountEmail ?? ''}
            onChange={handleInputChange('accountEmail')}
            helperText={t('settings.hints.accountEmail')}
            disabled={loading}
            fullWidth
            type="email"
          />
          <TextField
            label={t('settings.fields.avatarUrl')}
            value={settings.avatarUrl ?? ''}
            onChange={handleInputChange('avatarUrl')}
            helperText={t('settings.hints.avatarUrl')}
            disabled={loading}
            fullWidth
          />
        </Stack>

        <Divider flexItem />

        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar variant="rounded" sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
              <SettingsApplicationsIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">{t('settings.sections.application.title')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('settings.sections.application.description')}</Typography>
            </Box>
          </Stack>

          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>{t('settings.sections.llm.title')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('settings.sections.llm.description')}</Typography>
            </Box>
            <TextField
              label={t('settings.fields.apiBaseUrl')}
              value={settings.apiBaseUrl}
              onChange={handleInputChange('apiBaseUrl')}
              helperText={t('settings.hints.apiBaseUrl')}
              disabled={loading}
              fullWidth
            />
            <TextField
              label={t('settings.fields.apiKey')}
              value={settings.apiKey}
              type="password"
              onChange={handleInputChange('apiKey')}
              helperText={t('settings.hints.apiKey')}
              disabled={loading}
              fullWidth
            />
            <TextField
              label={t('settings.fields.model')}
              value={settings.model}
              onChange={handleInputChange('model')}
              helperText={t('settings.hints.model')}
              disabled={loading}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="preferred-llm-label">{t('settings.fields.preferredLLMVendor')}</InputLabel>
              <Select
                labelId="preferred-llm-label"
                label={t('settings.fields.preferredLLMVendor')}
                value={settings.preferredLLMVendor ?? 'openai'}
                onChange={handleSelectChange('preferredLLMVendor')}
                disabled={loading}
              >
                {llmVendors.map((vendor) => (
                  <MenuItem key={vendor} value={vendor}>{t(`settings.options.llmVendor.${vendor}`)}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">{t('settings.hints.preferredLLMVendor')}</Typography>
            </FormControl>
            <TextField
              label={t('settings.fields.organization')}
              value={settings.organization ?? ''}
              onChange={handleInputChange('organization')}
              helperText={t('settings.hints.organization')}
              disabled={loading}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('settings.fields.requestTimeoutSeconds')}
                type="number"
                value={settings.requestTimeoutSeconds ?? 15}
                onChange={handleNumberChange('requestTimeoutSeconds')}
                helperText={t('settings.hints.requestTimeoutSeconds')}
                disabled={loading}
                fullWidth
                inputProps={{ min: 5 }}
              />
              <TextField
                label={t('settings.fields.maxRetries')}
                type="number"
                value={settings.maxRetries ?? 1}
                onChange={handleNumberChange('maxRetries')}
                helperText={t('settings.hints.maxRetries')}
                disabled={loading}
                fullWidth
                inputProps={{ min: 0, max: 5 }}
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="language-label">{t('settings.fields.language')}</InputLabel>
              <Select
                labelId="language-label"
                label={t('settings.fields.language')}
                value={settings.language}
                onChange={handleSelectChange('language')}
                disabled={loading}
              >
                {languageOptions.map((code) => (
                  <MenuItem key={code} value={code}>{t(`languages.${code}`)}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">{t('settings.hints.language')}</Typography>
            </FormControl>
          </Stack>

          <Divider flexItem />

          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>{t('settings.sections.network.title')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('settings.sections.network.description')}</Typography>
            </Box>
            <TextField
              label={t('settings.fields.networkProxy')}
              value={settings.networkProxy ?? ''}
              onChange={handleInputChange('networkProxy')}
              helperText={t('settings.hints.networkProxy')}
              disabled={loading}
              fullWidth
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={settings.allowUntrustedCertificates ?? false}
                  onChange={handleInputChange('allowUntrustedCertificates')}
                  color="primary"
                />
              )}
              label={settings.allowUntrustedCertificates ? t('settings.toggles.enabled') : t('settings.toggles.disabled')}
            />
            <Typography variant="caption" color="text.secondary">{t('settings.hints.allowUntrustedCertificates')}</Typography>
          </Stack>

          <Divider flexItem />

          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>{t('settings.sections.automation.title')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('settings.sections.automation.description')}</Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.desktopCaptureEnabled}
                  onChange={handleInputChange('desktopCaptureEnabled')}
                  color="primary"
                />
              }
              label={settings.desktopCaptureEnabled ? t('settings.toggles.enabled') : t('settings.toggles.disabled')}
            />
            <Typography variant="caption" color="text.secondary">{t('settings.hints.desktopCaptureEnabled')}</Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.activityLogging}
                  onChange={handleInputChange('activityLogging')}
                  color="primary"
                />
              }
              label={settings.activityLogging ? t('settings.toggles.enabled') : t('settings.toggles.disabled')}
            />
            <Typography variant="caption" color="text.secondary">{t('settings.hints.activityLogging')}</Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.backgroundAutomation}
                  onChange={handleInputChange('backgroundAutomation')}
                  color="primary"
                />
              }
              label={settings.backgroundAutomation ? t('settings.toggles.enabled') : t('settings.toggles.disabled')}
            />
            <Typography variant="caption" color="text.secondary">{t('settings.hints.backgroundAutomation')}</Typography>

            <FormControl fullWidth>
              <InputLabel id="automation-browser-label">{t('settings.fields.automationBrowser')}</InputLabel>
              <Select
                labelId="automation-browser-label"
                label={t('settings.fields.automationBrowser')}
                value={settings.automationBrowser}
                onChange={handleSelectChange('automationBrowser')}
                disabled={loading}
              >
                {browserOptions.map((option) => (
                  <MenuItem key={option} value={option}>{t(`settings.options.browser.${option}`)}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">{t('settings.hints.automationBrowser')}</Typography>
            </FormControl>
            <TextField
              label={t('settings.fields.browserProfilePath')}
              value={settings.browserProfilePath ?? ''}
              onChange={handleInputChange('browserProfilePath')}
              helperText={t('settings.hints.browserProfilePath')}
              disabled={loading}
              fullWidth
            />
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => void handleTestConnection()}
            color="secondary"
            disabled={loading}
          >
            {t('app.actions.testConnection')}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void handleSave()}
            disabled={loading}
          >
            {t('app.actions.save')}
          </Button>
        </Stack>

        {connectionLabel}

        <Snackbar
          open={Boolean(snackbar)}
          autoHideDuration={4000}
          onClose={() => setSnackbar(null)}
        >
          {snackbar ? (
            <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>{snackbar.message}</Alert>
          ) : null}
        </Snackbar>
      </CardContent>
    </Card>
  );
};
