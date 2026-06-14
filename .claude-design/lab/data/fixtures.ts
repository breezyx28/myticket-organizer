export const MOCK_EMAIL = 'marina.ellis@pulse-events.co';

export const ORGANIZER_COPY = {
  loginEyebrow: 'Organizer dashboard',
  loginTitle: 'Sign in',
  loginSubtitle: 'Accounts are provisioned after your organizer application is approved on MyTicket.',
  forgotTitle: 'Reset password',
  forgotSubtitle: 'Enter the email tied to your organizer account. We will send a one-time code.',
  otpTitle: 'Check your inbox',
  otpSubtitle: `Enter the 6-digit code we sent to ${MOCK_EMAIL}.`,
  passwordTitle: 'Choose a new password',
  passwordSubtitle: 'Use at least 8 characters. You will sign in with this on your next visit.',
} as const;

export const RESET_STEPS = [
  { id: 'email', label: 'Email' },
  { id: 'otp', label: 'Verify code' },
  { id: 'password', label: 'New password' },
] as const;

export type ResetStepId = (typeof RESET_STEPS)[number]['id'];
