import { useEffect, useMemo, useState } from 'preact/hooks';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
} from '../wailsjs/go/main/App';
import type { ConnectionStatus, SettingsPayload } from '../types';

const languageOptions = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' }
];

const defaultSettings: SettingsPayload = {
  apiBaseUrl: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  organization: '',
  language: 'en',
  desktopCaptureEnabled: false,
  activityLogging: true
};

export const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<SettingsPayload>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(true);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await GetSettings();
        setSettings(response);
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

  const handleChange = (key: keyof SettingsPayload) => (event: any) => {
    const value = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (key === 'language') {
      void i18n.changeLanguage(String(value));
    }
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

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setSettings((prev) => ({ ...prev, language: value }));
    void i18n.changeLanguage(value);
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>{t('settings.title')}</Typography>
            <Typography variant="body1" color="text.secondary">{t('settings.description')}</Typography>
          </Box>

          <Stack spacing={2}>
            <TextField
              label={t('settings.fields.apiBaseUrl')}
              value={settings.apiBaseUrl}
              onChange={handleChange('apiBaseUrl')}
              helperText={t('settings.hints.apiBaseUrl')}
              disabled={loading}
              fullWidth
            />
            <TextField
              label={t('settings.fields.apiKey')}
              value={settings.apiKey}
              type="password"
              onChange={handleChange('apiKey')}
              helperText={t('settings.hints.apiKey')}
              disabled={loading}
              fullWidth
            />
            <TextField
              label={t('settings.fields.model')}
              value={settings.model}
              onChange={handleChange('model')}
              helperText={t('settings.hints.model')}
              disabled={loading}
              fullWidth
            />
            <TextField
              label={t('settings.fields.organization')}
              value={settings.organization ?? ''}
              onChange={handleChange('organization')}
              helperText={t('settings.hints.organization')}
              disabled={loading}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="language-label">{t('settings.fields.language')}</InputLabel>
              <Select
                labelId="language-label"
                label={t('settings.fields.language')}
                value={settings.language}
                onChange={handleLanguageChange}
                disabled={loading}
              >
                {languageOptions.map((option) => (
                  <MenuItem key={option.code} value={option.code}>{option.label}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">{t('settings.hints.language')}</Typography>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.desktopCaptureEnabled}
                  onChange={handleChange('desktopCaptureEnabled')}
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
                  onChange={handleChange('activityLogging')}
                  color="primary"
                />
              }
              label={settings.activityLogging ? t('settings.toggles.enabled') : t('settings.toggles.disabled')}
            />
            <Typography variant="caption" color="text.secondary">{t('settings.hints.activityLogging')}</Typography>
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
        </Stack>

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
