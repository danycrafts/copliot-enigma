import { useState } from 'preact/hooks';
import type { ChangeEvent } from 'react';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

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

  const handleSubmit = async (event: SubmitEvent) => {
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

  const handleFieldChange = (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
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
            onChange={handleFieldChange(setUsername)}
            required
          />
          <TextField
            label={t('auth.fields.email')}
            value={email}
            onChange={handleFieldChange(setEmail)}
            type="email"
          />
          <TextField
            label={t('auth.fields.password')}
            value={password}
            onChange={handleFieldChange(setPassword)}
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
