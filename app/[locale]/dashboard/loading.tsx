import { VendiLoader } from "@/components/shared/vendi-dot";

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <VendiLoader />
    </div>
  );
}
