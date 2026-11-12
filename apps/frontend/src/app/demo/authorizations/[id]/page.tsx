import { DetailClient } from "./~lib/detail-client";

export default async function AuthorizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetailClient id={id} />;
}
