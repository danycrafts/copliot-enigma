import { useCallback, useEffect, useState } from 'preact/hooks';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { GetOverview } from '../wailsjs/go/main/App';
import type { ActivityEvent, Overview } from '../types';

const formatTimestamp = (value: string, locale: string) => dayjs(value).locale(locale).format('LLL');

export const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await GetOverview();
      setOverview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const renderActivity = (activity: ActivityEvent) => (
    <ListItem key={activity.id} alignItems="flex-start" disableGutters divider>
      <ListItemText
        primary={
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>{activity.category}</Typography>
              <Typography variant="body2" color="text.secondary">{activity.description}</Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTimestamp(activity.timestamp, i18n.language)}
              </Typography>
            </Box>
            <Chip label={`${t('dashboard.activity.confidence')}: ${(activity.confidence * 100).toFixed(0)}%`} color="secondary" />
          </Stack>
        }
      />
    </ListItem>
  );

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('dashboard.title')}</Typography>
          <Typography variant="subtitle1" color="text.secondary">{t('app.tagline')}</Typography>
        </Box>
        <Button variant="outlined" startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={() => void loadOverview()} disabled={loading}>
          {t('app.actions.refresh')}
        </Button>
      </Stack>

      {error ? (
        <Card>
          <CardContent>
            <Typography color="error" variant="body1">{error}</Typography>
          </CardContent>
        </Card>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('dashboard.status.label')}</Typography>
              {loading && !overview ? (
                <CircularProgress size={24} />
              ) : overview?.connectionStatus ? (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    color={overview.connectionStatus.healthy ? 'success' : 'warning'}
                    label={overview.connectionStatus.healthy ? t('dashboard.status.healthy') : t('dashboard.status.unhealthy')}
                  />
                  <Typography variant="body2">{overview.connectionStatus.message}</Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">{t('dashboard.activity.empty')}</Typography>
              )}
              {overview?.settingsPath ? (
                <Typography variant="caption" display="block" mt={2} color="text.secondary">
                  {t('dashboard.settingsPath', { path: overview.settingsPath })}
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('dashboard.activity.title')}</Typography>
              {overview?.activitySample?.length ? (
                <List>
                  {overview.activitySample.map(renderActivity)}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">{t('dashboard.activity.empty')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('dashboard.telemetry.desktop')}</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('dashboard.telemetry.desktop')}</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {overview?.desktopCaptureEnabled ? t('dashboard.telemetry.enabled') : t('dashboard.telemetry.disabled')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('dashboard.telemetry.activity')}</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {overview?.activityLogging ? t('dashboard.telemetry.enabled') : t('dashboard.telemetry.disabled')}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};
