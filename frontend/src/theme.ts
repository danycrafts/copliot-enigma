import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1e88e5'
    },
    secondary: {
      main: '#8e24aa'
    },
    background: {
      default: '#111827',
      paper: '#1f2937'
    }
  },
  typography: {
    fontFamily: ['"Inter"', 'system-ui', 'sans-serif'].join(',')
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          borderRadius: 16
        }
      }
    }
  }
});
