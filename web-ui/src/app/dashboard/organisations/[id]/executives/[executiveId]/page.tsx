import { Suspense } from "react";
import { ExecutiveDetail } from "@/components/dashboard/executive-detail";

async function ExecutiveRouteContent({
  params,
}: {
  params: Promise<{ id: string; executiveId: string }>;
}) {
  const { id, executiveId } = await params;
  return <ExecutiveDetail key={`${id}/${executiveId}`} organisationId={id} executiveId={executiveId} />;
}

function ExecutiveRouteFallback() {
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-[1280px] place-items-center">
      <p role="status" className="text-sm text-muted-foreground">Opening executive details…</p>
    </div>
  );
}

export default function ExecutiveDetailPage({
  params,
}: { params: Promise<{ id: string; executiveId: string }> }) {
  return (
    <Suspense fallback={<ExecutiveRouteFallback />}>
      <ExecutiveRouteContent params={params} />
    </Suspense>
  );
}
