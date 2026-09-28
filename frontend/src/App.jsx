import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FeedbackProvider } from './contexts/FeedbackContext';
import AppRoutes from './routes/AppRoutes';
import theme from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <FeedbackProvider>
            <AppRoutes />
          </FeedbackProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
