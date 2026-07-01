import type { Metadata } from 'next';

import { PasswordResetForm } from '@features/auth/components/PasswordResetForm';

export const metadata: Metadata = { title: 'Reset password' };

export default function PasswordResetPage() {
  return <PasswordResetForm />;
}
