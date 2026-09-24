import { WizardSkeleton } from "@/components/PageSkeletons";
import { getMarketContext } from "@/i18n/server";

export default async function Loading() {
  const { t } = await getMarketContext();
  return <WizardSkeleton label={t("common.loading")} />;
}
