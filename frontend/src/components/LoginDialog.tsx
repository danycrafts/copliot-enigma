import { useState } from 'preact/hooks';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ChangeEvent, FormEvent } from 'react';

import { useAuth } from '../context/AuthContext';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginDialog = ({ open, onClose, onSuccess }: LoginDialogProps) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ username, email, password });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (submitting) {
      return;
    }
    onClose();
  };

  const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  return (
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="sm" component="form" onSubmit={handleSubmit}>
      <DialogTitle>{t('auth.loginTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            autoFocus
            label={t('auth.fields.username')}
            value={username}
            onChange={handleUsernameChange}
            required
          />
          <TextField
            label={t('auth.fields.email')}
            value={email}
            onChange={handleEmailChange}
            type="email"
          />
          <TextField
            label={t('auth.fields.password')}
            value={password}
            onChange={handlePasswordChange}
            type="password"
            required
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={submitting}>
          {t('auth.actions.cancel')}
        </Button>
        <Button type="submit" variant="contained" startIcon={<LockOpenIcon />} disabled={submitting}>
          {t('auth.actions.login')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
