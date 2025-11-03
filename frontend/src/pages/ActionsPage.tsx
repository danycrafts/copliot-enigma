import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import ShieldIcon from '@mui/icons-material/Shield';
import {
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const actionGroups: Array<{ key: string; icon: JSX.Element; actions: string[] }> = [
  {
    key: 'guidance',
    icon: <AutoAwesomeIcon color="primary" />,
    actions: ['dailyBrief', 'contextSummary', 'focusPlan']
  },
  {
    key: 'automation',
    icon: <BoltIcon color="secondary" />,
    actions: ['browserAutomation', 'workspacePreparation', 'meetingNotes']
  },
  {
    key: 'safety',
    icon: <ShieldIcon color="action" />,
    actions: ['privacyReview', 'policyGuardrails', 'networkStatus']
  }
];

export const ActionsPage = () => {
  const { t } = useTranslation();

  return (
    <Stack spacing={3} sx={{ '& .MuiCardContent-root': { p: { xs: 2, md: 3 } } }}>
      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h4" fontWeight={700}>{t('actions.title')}</Typography>
            <Typography variant="body1" color="text.secondary">{t('actions.description')}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={t('actions.badges.autonomous')} color="primary" variant="outlined" />
              <Chip label={t('actions.badges.humanInLoop')} color="secondary" variant="outlined" />
              <Chip label={t('actions.badges.compliance')} variant="outlined" />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {actionGroups.map((group) => (
          <Grid key={group.key} size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {group.icon}
                    <Typography variant="h6">{t(`actions.groups.${group.key}.title`)}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{t(`actions.groups.${group.key}.description`)}</Typography>
                </Stack>
                <List sx={{ mt: 1 }}>
                  {group.actions.map((actionKey) => (
                    <ListItem key={actionKey} alignItems="flex-start" disableGutters divider>
                      <ListItemText
                        primary={(
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                            <Typography variant="subtitle1" fontWeight={600}>{t(`actions.items.${actionKey}.name`)}</Typography>
                            <Stack direction="row" spacing={1}>
                              <Chip
                                size="small"
                                color="primary"
                                variant="outlined"
                                label={t(`actions.items.${actionKey}.automation`)}
                              />
                              <Chip
                                size="small"
                                variant="outlined"
                                label={t(`actions.items.${actionKey}.frequency`)}
                              />
                            </Stack>
                          </Stack>
                        )}
                        secondary={t(`actions.items.${actionKey}.description`)}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            <Typography variant="h6">{t('actions.playbook.title')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('actions.playbook.description')}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">{t('actions.playbook.steps.observe.title')}</Typography>
                <Typography variant="body2">{t('actions.playbook.steps.observe.description')}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">{t('actions.playbook.steps.plan.title')}</Typography>
                <Typography variant="body2">{t('actions.playbook.steps.plan.description')}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">{t('actions.playbook.steps.execute.title')}</Typography>
                <Typography variant="body2">{t('actions.playbook.steps.execute.description')}</Typography>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default ActionsPage;
