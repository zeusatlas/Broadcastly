import { Suspense } from "react";
import { OrganisationCreditHistory } from "@/components/dashboard/organisation-credit-history";

async function CreditHistoryRouteContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrganisationCreditHistory organisationId={id} />;
}

function CreditHistoryFallback() {
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-[1280px] place-items-center">
      <p role="status" className="text-sm text-muted-foreground">
        Opening credit history…
      </p>
    </div>
  );
}

export default function OrganisationCreditHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<CreditHistoryFallback />}>
      <CreditHistoryRouteContent params={params} />
    </Suspense>
  );
}
