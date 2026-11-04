import { Suspense } from "react";
import { OrganisationDetail } from "@/components/dashboard/organisation-detail";

async function OrganisationRouteContent({
  params,
}: {
  params: PageProps<"/dashboard/organisations/[id]">["params"];
}) {
  const { id } = await params;
  return <OrganisationDetail organisationId={id} />;
}

function OrganisationRouteFallback() {
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-[1280px] place-items-center">
      <p role="status" className="text-sm text-muted-foreground">Opening organisation details…</p>
    </div>
  );
}

export default function OrganisationDetailPage({
  params,
}: PageProps<"/dashboard/organisations/[id]">) {
  return (
    <Suspense fallback={<OrganisationRouteFallback />}>
      <OrganisationRouteContent params={params} />
    </Suspense>
  );
}
