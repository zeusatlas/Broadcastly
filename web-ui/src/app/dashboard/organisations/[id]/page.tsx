import { notFound } from "next/navigation";
import { OrganisationDetail } from "@/components/dashboard/organisation-detail";
import { organisations } from "@/lib/organisations";

export function generateStaticParams() {
  return organisations.map(({ id }) => ({ id }));
}

export default async function OrganisationDetailPage({
  params,
}: PageProps<"/dashboard/organisations/[id]">) {
  const { id } = await params;
  const organisation = organisations.find((item) => item.id === id);
  if (!organisation) notFound();

  return <OrganisationDetail organisation={organisation} />;
}
