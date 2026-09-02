import type { Metadata } from "next";
import { CategoryView } from "@/components/iffa/category-view";

export const metadata: Metadata = {
  title: "Finance",
  description: "IFFA — Finance events in Tamil Nadu and India, grouped and trend-ranked with source independence and claim provenance visible.",
};

export default function FinancePage() {
  return <CategoryView category="finance" />;
}
