import { CategoryNav } from "./category-nav";
import { FeedSection } from "@/components/feed/feed-section";
import { CATEGORY_LABEL, type CategoryId } from "@/lib/domain/categories";
import { clustersByCategory } from "@/lib/live/trends-view";
import { toFeedItems, categoryCount } from "@/lib/live/feed-view";
import { dataset } from "@/lib/live/dataset";

const BLURB: Record<string, string> = {
  crisis:
    "Public-safety and emergency events — weather, flood, accident, outbreak, law-and-order. Confirmed information is separated from what is still reported or unverified. IFFA is not an emergency service.",
  politics:
    "Governance, elections, the assembly and parliament, courts, and party statements. Claims are separated from established facts: who said what, what evidence exists, and what the other side says. No sentiment, ever.",
  finance:
    "RBI, markets, budget, GST, fuel and commodity prices, corporate results and fraud. Numbers are preserved exactly — a move in points is never a move in percent.",
  sports:
    "Results, fixtures, tournaments, selection and official disciplinary action. Different dates, competitions, and men's / women's / junior matches are kept as distinct events.",
};

const INITIAL = 18;

export function CategoryView({ category }: { category: CategoryId }) {
  const label = CATEGORY_LABEL[category];
  const items = toFeedItems(clustersByCategory(category, INITIAL));
  const total = categoryCount(category);

  return (
    <div className="flex flex-col gap-7">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Category</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight sm:text-[34px]">{label}</h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">{BLURB[category]}</p>
      </header>

      <CategoryNav active={category} />

      <FeedSection
        title={`${label} — trend-ranked`}
        note="Ordered by editorial priority. Open a story for the full ranking breakdown and every source."
        items={items}
        totalHint={total}
        more={{ category }}
        ranked
        columns={2}
        emptyText={`No ${label.toLowerCase()} event in the latest refresh. This edition's feeds are weighted toward Tamil Nadu crisis and governance reporting; finance and sports coverage grows as more official feeds are added (see /sources).`}
      />

      <p className="ui text-[11.5px] text-ink-3">
        Snapshot generated {new Date(dataset.generatedAt).toISOString()}.
      </p>
    </div>
  );
}
