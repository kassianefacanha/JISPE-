import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Typography,
} from '@mui/material';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [notice, setNotice] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const confirmationResolver = useRef(null);

  const notify = useCallback((message, severity = 'error') => {
    setNotice({ message, severity });
  }, []);

  const confirm = useCallback((options) => new Promise((resolve) => {
    confirmationResolver.current?.(false);
    confirmationResolver.current = resolve;
    setConfirmation({
      title: options.title || 'Confirmar ação',
      message: options.message,
      confirmLabel: options.confirmLabel || 'Confirmar',
      severity: options.severity || 'warning',
    });
  }), []);

  const resolveConfirmation = (value) => {
    confirmationResolver.current?.(value);
    confirmationResolver.current = null;
    setConfirmation(null);
  };

  return (
    <FeedbackContext.Provider value={{ notify, confirm }}>
      {children}
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setNotice(null);
        }}
      >
        <Alert onClose={() => setNotice(null)} severity={notice?.severity || 'info'} variant="filled">
          {notice?.message}
        </Alert>
      </Snackbar>
      <Dialog open={Boolean(confirmation)} onClose={() => resolveConfirmation(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirmation?.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmation?.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => resolveConfirmation(false)}>Cancelar</Button>
          <Button
            color={confirmation?.severity === 'error' ? 'error' : 'primary'}
            variant="contained"
            onClick={() => resolveConfirmation(true)}
          >
            {confirmation?.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider');
  return context;
}