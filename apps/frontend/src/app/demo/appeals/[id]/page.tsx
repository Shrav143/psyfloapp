import { AppealWorkspace } from "./~lib/appeal-workspace";

export default async function AppealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AppealWorkspace id={id} />;
}
