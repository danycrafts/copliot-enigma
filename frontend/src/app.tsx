import { useMemo } from 'preact/hooks';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsIcon from '@mui/icons-material/Settings';
import TimelineIcon from '@mui/icons-material/Timeline';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { ActivityPage } from './pages/ActivityPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';

const navItems = [
  { path: '/', icon: <ViewQuiltIcon />, labelKey: 'navigation.dashboard' },
  { path: '/activity', icon: <TimelineIcon />, labelKey: 'navigation.activity' },
  { path: '/settings', icon: <SettingsIcon />, labelKey: 'navigation.settings' }
];

const NavigationBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const activePath = useMemo(() => {
    const found = navItems.find((item) => location.pathname === item.path);
    return found ? found.path : '/';
  }, [location.pathname]);

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
          {t('app.title')}
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
          {navItems.map((item) => (
            <Button
              key={item.path}
              startIcon={item.icon}
              color={activePath === item.path ? 'primary' : 'inherit'}
              variant={activePath === item.path ? 'contained' : 'text'}
              onClick={() => navigate(item.path)}
              sx={{ textTransform: 'none' }}
            >
              {t(item.labelKey)}
            </Button>
          ))}
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton color="inherit" size="small" disableRipple>
              <LanguageIcon fontSize="small" />
            </IconButton>
            <Select
              size="small"
              value={i18n.language}
              onChange={(event) => void i18n.changeLanguage(String(event.target.value))}
              sx={{ color: 'inherit', minWidth: 120 }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Español</MenuItem>
            </Select>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

const AppContent = () => (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Container>
);

export const App = () => (
  <HashRouter>
    <Box minHeight="100vh" display="flex" flexDirection="column">
      <NavigationBar />
      <Box component="main" flexGrow={1}>
        <AppContent />
      </Box>
    </Box>
  </HashRouter>
);

export default App;
