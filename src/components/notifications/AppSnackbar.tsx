// src/components/notifications/AppSnackbar.tsx
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

type Props = {
  message: string | null;
  severity: 'error' | 'success';
  onClose: () => void;
};

export function AppSnackbar({ message, severity, onClose }: Props) {
  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
