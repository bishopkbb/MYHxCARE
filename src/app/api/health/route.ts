export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(
    {
      status: 'ok',
      service: 'myhxcare-hms',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
