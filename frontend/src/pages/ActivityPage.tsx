import { useEffect, useState } from 'preact/hooks';
import {
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
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

        {error ? (
          <Typography color="error">{error}</Typography>
        ) : null}

        {loading ? (
          <CircularProgress size={32} />
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};
