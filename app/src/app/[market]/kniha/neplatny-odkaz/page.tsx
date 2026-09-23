import { SessionExpired } from "@/features/configurator/components/SessionExpired";

// Odkaz z e-mailu už bol použitý alebo je starší ako posledný poslaný.
export default async function InvalidLinkPage({ searchParams }: PageProps<"/[market]/kniha/neplatny-odkaz">) {
  const { p } = await searchParams;
  return <SessionExpired projectId={typeof p === "string" && /^[0-9a-f-]{36}$/i.test(p) ? p : undefined} />;
}
