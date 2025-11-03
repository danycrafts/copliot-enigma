import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { GetOverview } from '../../wailsjs/go/main/App';
import type { ActivityEvent, Overview } from '../types';

const formatTimestamp = (value: string, locale: string) => dayjs(value).locale(locale).format('LLL');

export const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activitySample = overview?.activitySample ?? [];

  const activityByHour = useMemo(() => {
    if (!activitySample.length) {
      return [];
    }

    const bucket = new Map<string, number>();
    activitySample.forEach((event) => {
      const hour = dayjs(event.timestamp).format('HH:00');
      bucket.set(hour, (bucket.get(hour) ?? 0) + 1);
    });

    return Array.from(bucket.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([hour, value]) => ({ hour, value }));
  }, [activitySample]);

  const categoryDistribution = useMemo(() => {
    if (!activitySample.length) {
      return [];
    }

    const bucket = new Map<string, number>();
    activitySample.forEach((event) => {
      bucket.set(event.category, (bucket.get(event.category) ?? 0) + 1);
    });

    return Array.from(bucket.entries()).map(([name, value]) => ({ name, value }));
  }, [activitySample]);

  const confidenceTrend = useMemo(() => {
    if (!activitySample.length) {
      return [];
    }

    return activitySample
      .slice()
      .sort((a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf())
      .map((event, index) => ({
        index,
        confidence: Number((event.confidence * 100).toFixed(2)),
        label: dayjs(event.timestamp).format('HH:mm')
      }));
  }, [activitySample]);

  const averageConfidence = useMemo(() => {
    if (!activitySample.length) {
      return 0;
    }

    const total = activitySample.reduce((sum, item) => sum + item.confidence, 0);
    return Math.round((total / activitySample.length) * 100);
  }, [activitySample]);

  const topCategory = useMemo(() => {
    if (!activitySample.length) {
      return null;
    }

    const grouped = categoryDistribution.slice().sort((a, b) => b.value - a.value);
    return grouped.length ? grouped[0].name : null;
  }, [activitySample, categoryDistribution]);

  const renderTimelineBars = (data: { hour: string; value: number }[]) => {
    if (!data.length) {
      return null;
    }

    const maxValue = Math.max(...data.map((item) => item.value));

    return (
      <Stack direction="row" alignItems="flex-end" spacing={1} sx={{ height: 160 }}>
        {data.map((item) => (
          <Stack key={item.hour} spacing={1} alignItems="center" sx={{ width: `${100 / data.length}%` }}>
            <Box
              sx={{
                width: '100%',
                height: `${(item.value / maxValue) * 120 + 20}px`,
                borderRadius: 1,
                background: 'linear-gradient(180deg, rgba(25,118,210,0.9) 0%, rgba(25,118,210,0.5) 100%)'
              }}
            />
            <Typography variant="caption" color="text.secondary">{item.hour}</Typography>
          </Stack>
        ))}
      </Stack>
    );
  };

  const renderConfidenceSparkline = (data: { confidence: number; label: string }[]) => {
    if (!data.length) {
      return null;
    }

    const width = Math.max(120, data.length * 40);
    const height = 150;
    const maxValue = 100;

    const points = data
      .map((item, index) => {
        const x = (index / Math.max(1, data.length - 1)) * width;
        const y = height - (item.confidence / maxValue) * height;
        return `${x},${y}`;
      })
      .join(' ');

    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
      <Box sx={{ width: '100%', height }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="confidence-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9c27b0" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#9c27b0" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#confidence-gradient)" />
          <polyline points={points} fill="none" stroke="#9c27b0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
          {data.map((item) => (
            <Typography key={`${item.label}-${item.confidence}`} variant="caption" color="text.secondary">
              {item.label}
            </Typography>
          ))}
        </Stack>
      </Box>
    );
  };

  const renderCategoryBreakdown = (data: { name: string; value: number }[]) => {
    if (!data.length) {
      return null;
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
      <Stack spacing={2}>
        {data.map((item) => {
          const value = total ? Math.round((item.value / total) * 100) : 0;
          return (
            <Box key={item.name}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                <Typography variant="caption" color="text.secondary">{value}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={value} sx={{ height: 8, borderRadius: 5, mt: 0.5 }} />
            </Box>
          );
        })}
      </Stack>
    );
  };

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
              <Typography variant="h6" gutterBottom>{t('dashboard.metrics.healthTitle')}</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">{t('dashboard.metrics.lastSync')}</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {overview ? formatTimestamp(overview.lastRefresh, i18n.language) : t('dashboard.metrics.unknown')}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">{t('dashboard.metrics.activeLanguage')}</Typography>
                    <Chip label={t(`languages.${overview?.activeLanguage ?? 'en'}`)} color="primary" variant="outlined" />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">{t('dashboard.metrics.averageConfidence')}</Typography>
                    <Typography variant="h5" fontWeight={700}>{averageConfidence}%</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">{t('dashboard.metrics.topCategory')}</Typography>
                    <Typography variant="body1" fontWeight={600}>{topCategory ?? t('dashboard.metrics.unknown')}</Typography>
                  </Stack>
                </Grid>
              </Grid>
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

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title={t('dashboard.analytics.timelineTitle')} subheader={t('dashboard.analytics.timelineDescription')} />
            <CardContent>
              {activityByHour.length ? (
                renderTimelineBars(activityByHour)
              ) : (
                <Typography variant="body2" color="text.secondary">{t('dashboard.activity.empty')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title={t('dashboard.analytics.confidenceTitle')} subheader={t('dashboard.analytics.confidenceDescription')} />
            <CardContent>
              {confidenceTrend.length ? (
                renderConfidenceSparkline(confidenceTrend)
              ) : (
                <Typography variant="body2" color="text.secondary">{t('dashboard.activity.empty')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title={t('dashboard.analytics.categoryTitle')} subheader={t('dashboard.analytics.categoryDescription')} />
            <CardContent>
              {categoryDistribution.length ? (
                renderCategoryBreakdown(categoryDistribution)
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
