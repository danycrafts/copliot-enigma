import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Stack
} from '@mui/material';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { GetRecentActivity } from '../../wailsjs/go/main/App';
import type { ActivityEvent } from '../types';

export const ActivityPage = () => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(() => {
    if (!data.length) {
      return {
        totalEvents: 0,
        uniqueCategories: 0,
        averageConfidence: 0,
        busiestHour: '--'
      };
    }

    const totalEvents = data.length;
    const uniqueCategories = new Set(data.map((item) => item.category)).size;
    const averageConfidence = Math.round(
      (data.reduce((sum, item) => sum + item.confidence, 0) / totalEvents) * 100
    );
    const hourFrequency = new Map<string, number>();
    data.forEach((item) => {
      const hour = dayjs(item.timestamp).format('HH:00');
      hourFrequency.set(hour, (hourFrequency.get(hour) ?? 0) + 1);
    });
    const busiestHour = Array.from(hourFrequency.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '--';

    return { totalEvents, uniqueCategories, averageConfidence, busiestHour };
  }, [data]);

  const activityTimeline = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const grouped = new Map<string, number>();
    data.forEach((item) => {
      const day = dayjs(item.timestamp).format('MMM DD');
      grouped.set(day, (grouped.get(day) ?? 0) + 1);
    });

    return Array.from(grouped.entries()).map(([label, value]) => ({ label, value }));
  }, [data]);

  const confidenceSparkline = useMemo(() => {
    if (!data.length) {
      return [];
    }

    return data
      .slice()
      .sort((a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf())
      .map((item) => ({
        label: dayjs(item.timestamp).format('HH:mm'),
        confidence: Number((item.confidence * 100).toFixed(2))
      }));
  }, [data]);

  const categorySplit = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const grouped = new Map<string, number>();
    data.forEach((item) => {
      grouped.set(item.category, (grouped.get(item.category) ?? 0) + 1);
    });

    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  const renderTimeline = (timeline: { label: string; value: number }[]) => {
    if (!timeline.length) {
      return null;
    }

    const maxValue = Math.max(...timeline.map((item) => item.value));

    return (
      <Stack direction="row" alignItems="flex-end" spacing={1} sx={{ height: 160 }}>
        {timeline.map((item) => (
          <Stack key={item.label} spacing={1} alignItems="center" sx={{ width: `${100 / timeline.length}%` }}>
            <Box
              sx={{
                width: '100%',
                height: `${(item.value / maxValue) * 120 + 20}px`,
                borderRadius: 1,
                background: 'linear-gradient(180deg, rgba(25,118,210,0.9) 0%, rgba(25,118,210,0.4) 100%)'
              }}
            />
            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
          </Stack>
        ))}
      </Stack>
    );
  };

  const renderConfidenceSparkline = (sparkline: { label: string; confidence: number }[]) => {
    if (!sparkline.length) {
      return null;
    }

    const width = Math.max(120, sparkline.length * 40);
    const height = 150;

    const points = sparkline
      .map((item, index) => {
        const x = (index / Math.max(1, sparkline.length - 1)) * width;
        const y = height - (item.confidence / 100) * height;
        return `${x},${y}`;
      })
      .join(' ');

    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
      <Box sx={{ width: '100%', height }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="activity-confidence-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26a69a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#26a69a" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#activity-confidence-gradient)" />
          <polyline points={points} fill="none" stroke="#26a69a" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
          {sparkline.map((item) => (
            <Typography key={`${item.label}-${item.confidence}`} variant="caption" color="text.secondary">
              {item.label}
            </Typography>
          ))}
        </Stack>
      </Box>
    );
  };

  const renderCategoryList = (categories: { name: string; value: number }[]) => {
    if (!categories.length) {
      return null;
    }

    const total = categories.reduce((sum, item) => sum + item.value, 0);

    return (
      <Stack spacing={2}>
        {categories.map((item) => {
          const percentage = total ? Math.round((item.value / total) * 100) : 0;
          return (
            <Box key={item.name}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                <Typography variant="caption" color="text.secondary">{percentage}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={percentage} sx={{ height: 8, borderRadius: 5, mt: 0.5 }} />
            </Box>
          );
        })}
      </Stack>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await GetRecentActivity();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  return (
    <Card>
      <CardContent>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t('activity.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {t('activity.description')}
        </Typography>

        <Grid container spacing={3} sx={{ mb: 1 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">{t('activity.metrics.totalEvents')}</Typography>
            <Typography variant="h5" fontWeight={700}>{metrics.totalEvents}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">{t('activity.metrics.uniqueCategories')}</Typography>
            <Typography variant="h5" fontWeight={700}>{metrics.uniqueCategories}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">{t('activity.metrics.averageConfidence')}</Typography>
            <Typography variant="h5" fontWeight={700}>{metrics.averageConfidence}%</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">{t('activity.metrics.busiestHour')}</Typography>
            <Typography variant="h5" fontWeight={700}>{metrics.busiestHour}</Typography>
          </Grid>
        </Grid>

        {error ? (
          <Typography color="error">{error}</Typography>
        ) : null}

        {loading ? (
          <CircularProgress size={32} />
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>{t('activity.charts.timelineTitle')}</Typography>
              <Card elevation={0} sx={{ backgroundColor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent>
                  {activityTimeline.length ? (
                    renderTimeline(activityTimeline)
                  ) : (
                    <Typography variant="body2" color="text.secondary">{t('activity.emptyState')}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>{t('activity.charts.confidenceTitle')}</Typography>
              <Card elevation={0} sx={{ backgroundColor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent>
                  {confidenceSparkline.length ? (
                    renderConfidenceSparkline(confidenceSparkline)
                  ) : (
                    <Typography variant="body2" color="text.secondary">{t('activity.emptyState')}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>{t('activity.charts.categoryTitle')}</Typography>
              <Card elevation={0} sx={{ backgroundColor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent>
                  {categorySplit.length ? (
                    renderCategoryList(categorySplit)
                  ) : (
                    <Typography variant="body2" color="text.secondary">{t('activity.emptyState')}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>{t('activity.table.title')}</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('activity.table.category')}</TableCell>
                    <TableCell>{t('activity.table.description')}</TableCell>
                    <TableCell>{t('activity.table.timestamp')}</TableCell>
                    <TableCell align="right">{t('activity.table.confidence')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.length ? (
                    data.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>{dayjs(row.timestamp).locale(i18n.language).format('LLL')}</TableCell>
                        <TableCell align="right">{(row.confidence * 100).toFixed(0)}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        {t('dashboard.activity.empty')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};
