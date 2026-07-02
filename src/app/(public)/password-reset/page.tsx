import type { Metadata } from 'next';

import { PasswordResetRequestForm } from '@features/auth/components/PasswordResetRequestForm';
import { PasswordResetSetForm } from '@features/auth/components/PasswordResetSetForm';

type SearchParams = Promise<{ token?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { token } = await searchParams;
  return { title: token ? 'Set new password' : 'Reset password' };
}

export default async function PasswordResetPage({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;

  return token ? <PasswordResetSetForm token={token} /> : <PasswordResetRequestForm />;
}
