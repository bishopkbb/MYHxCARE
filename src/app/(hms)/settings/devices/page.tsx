import { TrustedDevicesList } from '@features/auth/components/TrustedDevicesList';

export const metadata = {
  title: 'Trusted Devices',
};

export default function TrustedDevicesPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <TrustedDevicesList />
    </div>
  );
}
