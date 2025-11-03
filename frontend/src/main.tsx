import { render } from 'preact';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { I18nextProvider } from 'react-i18next';

import { App } from './app';
import { theme } from './theme';
import i18n from './i18n';
import './style.css';

const Root = () => (
  <I18nextProvider i18n={i18n}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </I18nextProvider>
);

render(<Root />, document.getElementById('app')!);
