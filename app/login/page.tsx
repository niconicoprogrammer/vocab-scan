'use client'

import { signIn, signUp } from './actions'
import { Box, Button, Stack, TextField, Typography, Card, CardContent,
  Divider,
  CircularProgress, Alert} from '@mui/material'
import { useState, useActionState } from 'react';

export default function LoginPage() {
  const [signInErrorMessage, signInFormAction, signInIsPending] = useActionState(signIn, undefined);
  const [signUpErrorMessage, signUpFormAction, signUpIsPending] = useActionState(signUp, undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // どちらかが処理中なら全体をロック
  const isBusy = signInIsPending || signUpIsPending;
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Sign in / Sign Up
          </Typography>

          {/* エラーメッセージ（直近の実行に応じて片方だけ出る想定） */}
          {signInErrorMessage && (
            <Alert severity="error" sx={{ mb: 2 }} role="alert" aria-live="polite" data-testid="login-error">
              {String(signInErrorMessage)}
            </Alert>
          )}
          {signUpErrorMessage && (
            <Alert severity="error" sx={{ mb: 2 }} role="alert" aria-live="polite" data-testid="signup-error">
              {String(signUpErrorMessage)}
            </Alert>
          )}

          <form noValidate>
            <Stack spacing={2}>
              <TextField
                id="email"
                name="email"
                type="email"
                label="Email"
                required
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                disabled={isBusy}
              />
              <TextField
                id="password"
                name="password"
                type="password"
                label="Password"
                required
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isBusy}
              />

              <Divider flexItem />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  formAction={signInFormAction}
                  disabled={isBusy}
                  aria-busy={signInIsPending ? 'true' : undefined}
                  startIcon={signInIsPending ? <CircularProgress size={18} /> : null}
                  sx={{ minWidth: 150}}
                >
                  {signInIsPending ? 'Signing in…' : 'Sign in'}
                </Button>

                <Button
                  type="submit"
                  variant="outlined"
                  color="secondary"
                  formAction={signUpFormAction}
                  disabled={isBusy}
                  aria-busy={signUpIsPending ? 'true' : undefined}
                  startIcon={signUpIsPending ? <CircularProgress size={18} /> : null}
                  sx={{ minWidth: 150}}
                >
                  {signUpIsPending ? 'Signing up…' : 'Sign up'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
