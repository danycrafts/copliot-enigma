import { useMemo, useState } from 'preact/hooks';
import BoltIcon from '@mui/icons-material/Bolt';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsIcon from '@mui/icons-material/Settings';
import TimelineIcon from '@mui/icons-material/Timeline';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PersonIcon from '@mui/icons-material/Person';
import { useTranslation } from 'react-i18next';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { LoginDialog } from './components/LoginDialog';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActivityPage } from './pages/ActivityPage';
import { ActionsPage } from './pages/ActionsPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';

const navItems = [
  { path: '/', icon: <ViewQuiltIcon />, labelKey: 'navigation.dashboard' },
  { path: '/activity', icon: <TimelineIcon />, labelKey: 'navigation.activity' },
  { path: '/actions', icon: <BoltIcon />, labelKey: 'navigation.actions' },
  { path: '/settings', icon: <SettingsIcon />, labelKey: 'navigation.settings' }
];

const NavigationBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { session, logout } = useAuth();
  const languageOptions = ['en', 'es', 'de'] as const;
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const authenticated = Boolean(session?.authenticated);
  const avatarSource = session?.profile?.avatarData || session?.profile?.avatarUrl;
  const displayName = session?.profile?.displayName ?? t('auth.guest');

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
              {languageOptions.map((code) => (
                <MenuItem key={code} value={code}>{t(`languages.${code}`)}</MenuItem>
              ))}
            </Select>
          </Stack>
          {authenticated ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title={t('auth.menuTitle', { name: displayName })}>
                <IconButton onClick={(event) => setMenuAnchor(event.currentTarget)} size="small" color="inherit">
                  <Avatar src={avatarSource} alt={displayName}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                {displayName}
              </Typography>
            </Stack>
          ) : (
            <Button variant="outlined" onClick={() => setLoginOpen(true)} sx={{ textTransform: 'none' }}>
              {t('auth.actions.openLogin')}
            </Button>
          )}
        </Stack>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem disabled>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">{displayName}</Typography>
              {session?.profile?.email ? (
                <Typography variant="caption" color="text.secondary">{session?.profile?.email}</Typography>
              ) : null}
            </Stack>
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              navigate('/settings');
            }}
          >
            <ListItemIcon>
              <ManageAccountsIcon fontSize="small" />
            </ListItemIcon>
            {t('auth.menu.settings')}
          </MenuItem>
          <MenuItem
            onClick={async () => {
              await logout();
              setMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            {t('auth.actions.logout')}
          </MenuItem>
        </Menu>
        <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={() => setLoginOpen(false)} />
      </Toolbar>
    </AppBar>
  );
};

const AppContent = () => (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/actions" element={<ActionsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Container>
);

export const App = () => (
  <AuthProvider>
    <HashRouter>
      <Box minHeight="100vh" display="flex" flexDirection="column">
        <NavigationBar />
        <Box component="main" flexGrow={1}>
          <AppContent />
        </Box>
      </Box>
    </HashRouter>
  </AuthProvider>
);

export default App;
