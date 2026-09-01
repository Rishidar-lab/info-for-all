/**
 * IFA demonstration dataset.
 *
 * Everything in this file is synthetic. Publications, people, quotes, dates and
 * events are invented to demonstrate IFA's comparison model. Nothing here is a
 * real news report. All publication domains use the reserved `.example` TLD and
 * therefore cannot resolve to a real site.
 *
 * This module has NO dependencies on the database or any service layer, so it
 * can be swapped for a real ingestion/API backend without touching components.
 */

export type Perspective = "left" | "center" | "right";
export type Reliability = "high" | "mixed" | "unknown";

export interface Article {
  id: string;
  publication: string;
  headline: string;
  /** Publication homepage — demo data links never claim a specific article exists. */
  url: string;
  publishedAt: string;
  perspective: Perspective;
  reliability: Reliability;
  excerpt: string;
}

export interface CoverageDifference {
  topic: string;
  /** How each publication frames or emphasises this aspect. */
  observations: {
    publication: string;
    emphasis: string;
  }[];
}

export interface StoryCluster {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  coverage: {
    left: number;
    center: number;
    right: number;
  };
  commonFacts: string[];
  coverageDifferences: CoverageDifference[];
  articles: Article[];
}

export interface Source {
  id: string;
  publication: string;
  website: string;
  perspective: Perspective;
  reliability: Reliability;
  region: string;
  description: string;
}

export const DEMO_NOTICE =
  "Demonstration dataset — source metadata and story examples are provided to demonstrate IFA's comparison model and should not be interpreted as live reporting.";

export const PERSPECTIVE_NOTE =
  "Perspective classifications describe broad editorial orientation and are not measures of factual accuracy.";

export const RELIABILITY_NOTE =
  "Reliability is a separate dimension from perspective. In this demonstration dataset it reflects an illustrative editorial assessment, not an audited score.";

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export const SOURCES: Source[] = [
  {
    id: "src-meridian",
    publication: "The Meridian",
    website: "https://www.themeridian.example",
    perspective: "center",
    reliability: "high",
    region: "United Kingdom",
    description:
      "A demonstration national daily used in IFA examples to represent institutional, wire-influenced reporting with heavy sourcing and correction notices.",
  },
  {
    id: "src-northlight",
    publication: "Northlight Public Broadcasting",
    website: "https://www.northlight.example",
    perspective: "center",
    reliability: "high",
    region: "Nordic region",
    description:
      "A demonstration public-service broadcaster. In IFA examples it stands in for outlets with formal impartiality obligations and published editorial guidelines.",
  },
  {
    id: "src-capital-ledger",
    publication: "Capital Ledger",
    website: "https://www.capitalledger.example",
    perspective: "right",
    reliability: "high",
    region: "United States",
    description:
      "A demonstration business and markets publication. IFA uses it to represent fiscally-focused coverage that foregrounds cost, debt and private-sector effects.",
  },
  {
    id: "src-commons-review",
    publication: "The Commons Review",
    website: "https://www.commonsreview.example",
    perspective: "left",
    reliability: "mixed",
    region: "United States",
    description:
      "A demonstration current-affairs magazine. In IFA examples it represents explanatory, movement-adjacent coverage that emphasises equity and public provision.",
  },
  {
    id: "src-dispatch-wire",
    publication: "Dispatch Wire",
    website: "https://www.dispatchwire.example",
    perspective: "center",
    reliability: "high",
    region: "International",
    description:
      "A demonstration wire service. IFA uses it to represent terse, agency-style reporting that many other outlets quote or reprint.",
  },
  {
    id: "src-frontier-tech",
    publication: "Frontier Tech Journal",
    website: "https://www.frontiertech.example",
    perspective: "center",
    reliability: "mixed",
    region: "United States",
    description:
      "A demonstration technology trade publication. In IFA examples it supplies granular product and industry detail with lighter political framing.",
  },
  {
    id: "src-standard-record",
    publication: "The Standard Record",
    website: "https://www.standardrecord.example",
    perspective: "right",
    reliability: "mixed",
    region: "United States",
    description:
      "A demonstration general-interest outlet used to represent centre-right coverage that emphasises deregulation, competitiveness and national interest.",
  },
  {
    id: "src-vantage-daily",
    publication: "Vantage Daily",
    website: "https://www.vantagedaily.example",
    perspective: "left",
    reliability: "mixed",
    region: "United Kingdom",
    description:
      "A demonstration digital-native outlet. IFA uses it to represent fast, campaigning coverage that leads with affected communities and accountability angles.",
  },
  {
    id: "src-observer-quarterly",
    publication: "Observer Quarterly",
    website: "https://www.observerquarterly.example",
    perspective: "center",
    reliability: "high",
    region: "International",
    description:
      "A demonstration long-form review. In IFA examples it publishes slower context pieces and methodological caveats rather than breaking coverage.",
  },
  {
    id: "src-signal-brief",
    publication: "Signal Brief",
    website: "https://www.signalbrief.example",
    perspective: "center",
    reliability: "unknown",
    region: "Unknown",
    description:
      "A demonstration aggregator-style site with limited masthead information. IFA uses it to show how unknown provenance is displayed rather than hidden.",
  },
  {
    id: "src-heartland-monitor",
    publication: "Heartland Monitor",
    website: "https://www.heartlandmonitor.example",
    perspective: "right",
    reliability: "mixed",
    region: "United States (Midwest)",
    description:
      "A demonstration regional outlet. In IFA examples it emphasises local economic impact, energy prices and effects on domestic industry.",
  },
  {
    id: "src-atlas-globe",
    publication: "Atlas & Globe",
    website: "https://www.atlasglobe.example",
    perspective: "left",
    reliability: "high",
    region: "International",
    description:
      "A demonstration foreign-affairs publication used to represent internationally-framed coverage that stresses cross-border comparison and obligations.",
  },
];

const sourceByName = new Map(SOURCES.map((s) => [s.publication, s]));

/** Look up demonstration source metadata by publication name. */
export function sourceFor(publication: string): Source | undefined {
  return sourceByName.get(publication);
}

/* ------------------------------------------------------------------ */
/* Story clusters                                                      */
/* ------------------------------------------------------------------ */

export const STORIES: StoryCluster[] = [
  {
    id: "story-renewables",
    slug: "national-renewable-energy-investment-programme",
    title:
      "Government announces a multi-year national renewable-energy investment programme",
    summary:
      "A national government has announced a programme to fund grid upgrades, offshore wind and domestic manufacturing of clean-energy components over several years. The announcement sets headline figures and timelines; several implementation details depend on later regulation and budget votes.",
    category: "Public policy",
    publishedAt: "2026-02-11T09:00:00Z",
    updatedAt: "2026-02-12T16:30:00Z",
    coverage: { left: 33, center: 42, right: 25 },
    commonFacts: [
      "The programme was formally announced by the government at a scheduled briefing.",
      "Funding is allocated in stages across several years rather than in a single disbursement.",
      "Stated priorities include electricity-grid upgrades, offshore wind capacity and domestic component manufacturing.",
      "Parts of the programme require additional legislation and regulatory approval before spending begins.",
    ],
    coverageDifferences: [
      {
        topic: "Economic framing",
        observations: [
          {
            publication: "The Commons Review",
            emphasis:
              "Leads with public investment and job creation, presenting the programme as overdue industrial strategy.",
          },
          {
            publication: "The Meridian",
            emphasis:
              "Presents the headline figure alongside independent analysts' notes on projected private-sector co-investment.",
          },
          {
            publication: "Capital Ledger",
            emphasis:
              "Foregrounds the fiscal cost, borrowing implications and the risk that targets slip if interest rates stay high.",
          },
        ],
      },
      {
        topic: "Political framing",
        observations: [
          {
            publication: "Vantage Daily",
            emphasis:
              "Frames the announcement as a response to sustained campaigning by climate and union groups.",
          },
          {
            publication: "The Standard Record",
            emphasis:
              "Frames it as a pre-election spending commitment and quotes opposition figures questioning deliverability.",
          },
          {
            publication: "Northlight Public Broadcasting",
            emphasis:
              "Attributes claims to named officials and opposition spokespeople without adopting either characterisation.",
          },
        ],
      },
      {
        topic: "Context emphasised",
        observations: [
          {
            publication: "Atlas & Globe",
            emphasis:
              "Compares the programme's scale with similar packages in other countries and notes international supply-chain competition.",
          },
          {
            publication: "Heartland Monitor",
            emphasis:
              "Centres effects on regional manufacturing towns and existing energy-sector employment.",
          },
          {
            publication: "Observer Quarterly",
            emphasis:
              "Adds historical context on previous programmes that missed targets and the conditions that made some succeed.",
          },
        ],
      },
      {
        topic: "Quoted voices",
        observations: [
          {
            publication: "Dispatch Wire",
            emphasis:
              "Quotes the finance ministry statement and one industry association, kept short.",
          },
          {
            publication: "The Commons Review",
            emphasis:
              "Quotes union representatives, an environmental economist and a community organiser.",
          },
          {
            publication: "Capital Ledger",
            emphasis:
              "Quotes bond-market analysts, a credit-rating commentator and a manufacturing CEO.",
          },
        ],
      },
    ],
    articles: [
      {
        id: "art-ren-1",
        publication: "Dispatch Wire",
        headline:
          "Government sets out multi-year renewable-energy investment plan",
        url: "https://www.dispatchwire.example",
        publishedAt: "2026-02-11T09:20:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "The government said the programme would be funded in stages and would prioritise grid upgrades, offshore wind and domestic manufacturing. Officials said further regulation would follow.",
      },
      {
        id: "art-ren-2",
        publication: "The Meridian",
        headline:
          "Renewables programme: the headline number, and what analysts say sits behind it",
        url: "https://www.themeridian.example",
        publishedAt: "2026-02-11T13:05:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "Independent analysts welcomed the direction but cautioned that the stated total blends new money with previously announced funds, and that delivery depends on planning reform.",
      },
      {
        id: "art-ren-3",
        publication: "The Commons Review",
        headline: "A real industrial strategy, finally — if it survives contact with the budget",
        url: "https://www.commonsreview.example",
        publishedAt: "2026-02-11T18:40:00Z",
        perspective: "left",
        reliability: "mixed",
        excerpt:
          "For years, advocates argued that public investment at this scale was both possible and necessary. The announcement vindicates that case, though the phased structure leaves room for future governments to retreat.",
      },
      {
        id: "art-ren-4",
        publication: "Capital Ledger",
        headline: "Clean-energy plan adds to borrowing as rate path stays uncertain",
        url: "https://www.capitalledger.example",
        publishedAt: "2026-02-11T20:10:00Z",
        perspective: "right",
        reliability: "high",
        excerpt:
          "Markets took the announcement in stride, but analysts flagged that the multi-year commitments raise the deficit projection and that manufacturing targets assume supply-chain costs fall.",
      },
      {
        id: "art-ren-5",
        publication: "Heartland Monitor",
        headline: "What the energy programme could mean for factory towns",
        url: "https://www.heartlandmonitor.example",
        publishedAt: "2026-02-12T08:15:00Z",
        perspective: "right",
        reliability: "mixed",
        excerpt:
          "Local officials said the domestic-manufacturing element was the part that mattered here, while cautioning that previous federal programmes had not always translated into regional jobs.",
      },
      {
        id: "art-ren-6",
        publication: "Atlas & Globe",
        headline: "The programme in international context: ambitious, not unprecedented",
        url: "https://www.atlasglobe.example",
        publishedAt: "2026-02-12T15:00:00Z",
        perspective: "left",
        reliability: "high",
        excerpt:
          "Several countries have launched comparable packages in the past three years. The distinguishing question is execution capacity: permitting timelines, grid connections and skilled labour.",
      },
    ],
  },

  {
    id: "story-open-model",
    slug: "technology-company-releases-open-ai-model",
    title: "A large technology company releases a new open-weights AI model",
    summary:
      "A major technology company has published a new AI model with openly downloadable weights and a permissive licence for most uses. Coverage agrees on the release and the licence terms but differs on how significant the capability step is and what the safety and market implications are.",
    category: "Technology",
    publishedAt: "2026-03-04T15:00:00Z",
    updatedAt: "2026-03-05T11:20:00Z",
    coverage: { left: 22, center: 55, right: 23 },
    commonFacts: [
      "The company released the model with openly downloadable weights.",
      "The licence permits commercial use with stated restrictions on certain high-risk applications.",
      "The company published evaluation numbers on standard public benchmarks.",
      "Independent replication of the benchmark results had not been completed at the time of publication.",
    ],
    coverageDifferences: [
      {
        topic: "Significance of the capability step",
        observations: [
          {
            publication: "Frontier Tech Journal",
            emphasis:
              "Describes incremental gains on most benchmarks and a larger jump on long-context tasks; treats it as a strong open release, not a frontier leap.",
          },
          {
            publication: "The Meridian",
            emphasis:
              "Reports the company's framing and adds outside researchers who say the benchmark lead is real but narrow.",
          },
          {
            publication: "Signal Brief",
            emphasis:
              "Headline states the model 'beats' larger competitors, citing the company's own chart without additional attribution.",
          },
        ],
      },
      {
        topic: "Safety and governance",
        observations: [
          {
            publication: "Observer Quarterly",
            emphasis:
              "Focuses on what open weights mean for misuse, and on the limits of licence terms once weights are distributed.",
          },
          {
            publication: "The Commons Review",
            emphasis:
              "Emphasises concentration of compute and argues open weights are a partial, insufficient answer to that.",
          },
          {
            publication: "Capital Ledger",
            emphasis:
              "Frames safety commentary mainly as a potential regulatory cost and competitive constraint.",
          },
        ],
      },
      {
        topic: "Market framing",
        observations: [
          {
            publication: "Capital Ledger",
            emphasis:
              "Leads on pressure to closed-model pricing and on which cloud providers benefit from hosting demand.",
          },
          {
            publication: "The Standard Record",
            emphasis:
              "Frames the release as a competitiveness win for the company's home country against overseas rivals.",
          },
          {
            publication: "Dispatch Wire",
            emphasis:
              "States the release, the licence and the company's benchmark claims without market interpretation.",
          },
        ],
      },
    ],
    articles: [
      {
        id: "art-model-1",
        publication: "Dispatch Wire",
        headline: "Technology company publishes open-weights AI model under permissive licence",
        url: "https://www.dispatchwire.example",
        publishedAt: "2026-03-04T15:25:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "The weights are downloadable and the licence allows commercial use with restrictions on specified high-risk uses. The company reported results on public benchmarks.",
      },
      {
        id: "art-model-2",
        publication: "Frontier Tech Journal",
        headline: "The new open model: strong, especially on long context — but read the eval notes",
        url: "https://www.frontiertech.example",
        publishedAt: "2026-03-04T19:00:00Z",
        perspective: "center",
        reliability: "mixed",
        excerpt:
          "On most public benchmarks the gains are modest. The clearer improvement is on long-context retrieval. As always, vendor-reported numbers await independent replication.",
      },
      {
        id: "art-model-3",
        publication: "Observer Quarterly",
        headline: "Open weights, open questions: distribution changes what a licence can do",
        url: "https://www.observerquarterly.example",
        publishedAt: "2026-03-05T09:30:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "Once weights are downloadable, licence conditions become difficult to enforce. The governance conversation should focus less on the release event and more on evaluation and deployment norms.",
      },
      {
        id: "art-model-4",
        publication: "Capital Ledger",
        headline: "Open model release pressures paid-API pricing; cloud hosts stand to gain",
        url: "https://www.capitalledger.example",
        publishedAt: "2026-03-05T10:05:00Z",
        perspective: "right",
        reliability: "high",
        excerpt:
          "Analysts said the release intensifies price competition for closed models and shifts some value toward infrastructure providers that serve inference demand.",
      },
      {
        id: "art-model-5",
        publication: "The Commons Review",
        headline: "An open model doesn't solve who owns the compute",
        url: "https://www.commonsreview.example",
        publishedAt: "2026-03-05T12:40:00Z",
        perspective: "left",
        reliability: "mixed",
        excerpt:
          "Releasing weights is welcome, but training and serving models at this scale still depends on a handful of firms. Openness at the model layer leaves the infrastructure question untouched.",
      },
      {
        id: "art-model-6",
        publication: "Signal Brief",
        headline: "New AI model beats bigger rivals, company says",
        url: "https://www.signalbrief.example",
        publishedAt: "2026-03-04T16:10:00Z",
        perspective: "center",
        reliability: "unknown",
        excerpt:
          "The model outperforms larger competitors across benchmarks, according to figures released by the company.",
      },
    ],
  },

  {
    id: "story-climate-study",
    slug: "large-climate-study-published",
    title: "Researchers publish findings from a large multi-year climate study",
    summary:
      "A peer-reviewed study pooling data from many monitoring stations reports refined estimates for a regional climate trend and its uncertainty range. Coverage agrees on the publication and the central estimate but differs on how to characterise the uncertainty and the policy implications.",
    category: "Science",
    publishedAt: "2026-01-22T11:00:00Z",
    updatedAt: "2026-01-23T09:45:00Z",
    coverage: { left: 30, center: 50, right: 20 },
    commonFacts: [
      "The study was published in a peer-reviewed journal after external review.",
      "It combines observational data from a large number of monitoring stations over more than a decade.",
      "The authors report a central estimate together with a stated confidence interval.",
      "The authors describe specific limitations, including uneven station coverage in some regions.",
    ],
    coverageDifferences: [
      {
        topic: "How uncertainty is characterised",
        observations: [
          {
            publication: "Northlight Public Broadcasting",
            emphasis:
              "Reports the central estimate and the confidence interval together, and quotes an author on what the interval means.",
          },
          {
            publication: "Vantage Daily",
            emphasis:
              "Leads with the upper end of the range in the headline; the interval appears lower in the article.",
          },
          {
            publication: "The Standard Record",
            emphasis:
              "Leads with the existence of an uncertainty range and quotes a scientist not involved in the study urging caution.",
          },
        ],
      },
      {
        topic: "Policy implications",
        observations: [
          {
            publication: "The Commons Review",
            emphasis:
              "Connects the findings directly to arguments for faster emissions cuts and adaptation funding.",
          },
          {
            publication: "Capital Ledger",
            emphasis:
              "Focuses on projected costs of proposed responses and on which sectors would be most affected.",
          },
          {
            publication: "Observer Quarterly",
            emphasis:
              "Argues the single study should be read alongside the existing body of work rather than as a turning point.",
          },
        ],
      },
      {
        topic: "Source of expertise quoted",
        observations: [
          {
            publication: "The Meridian",
            emphasis:
              "Quotes two study authors and one independent climate scientist.",
          },
          {
            publication: "Vantage Daily",
            emphasis:
              "Quotes one study author and two campaigners.",
          },
          {
            publication: "Heartland Monitor",
            emphasis:
              "Quotes a local official and an agricultural economist on regional effects.",
          },
        ],
      },
    ],
    articles: [
      {
        id: "art-clim-1",
        publication: "Northlight Public Broadcasting",
        headline: "Large climate study refines regional trend estimate, with stated uncertainty",
        url: "https://www.northlight.example",
        publishedAt: "2026-01-22T11:30:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "The peer-reviewed study reports a central figure and a confidence interval. One author said the interval reflects gaps in station coverage, not doubt about the direction of the trend.",
      },
      {
        id: "art-clim-2",
        publication: "The Meridian",
        headline: "New study sharpens a regional climate estimate; scientists urge context",
        url: "https://www.themeridian.example",
        publishedAt: "2026-01-22T15:20:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "Independent researchers said the result is consistent with prior work and narrows the range rather than overturning it.",
      },
      {
        id: "art-clim-3",
        publication: "Vantage Daily",
        headline: "Climate trend could be worse than thought, study suggests",
        url: "https://www.vantagedaily.example",
        publishedAt: "2026-01-22T17:05:00Z",
        perspective: "left",
        reliability: "mixed",
        excerpt:
          "The study's upper estimate points to a faster shift than earlier figures. Campaigners said it strengthens the case for accelerated action.",
      },
      {
        id: "art-clim-4",
        publication: "The Standard Record",
        headline: "Scientists publish climate study — and a wide uncertainty range",
        url: "https://www.standardrecord.example",
        publishedAt: "2026-01-22T18:30:00Z",
        perspective: "right",
        reliability: "mixed",
        excerpt:
          "The authors themselves flag limitations. A scientist not involved said single studies should not drive policy on their own.",
      },
      {
        id: "art-clim-5",
        publication: "Observer Quarterly",
        headline: "One study, in context: what the new climate paper does and doesn't change",
        url: "https://www.observerquarterly.example",
        publishedAt: "2026-01-23T09:00:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "The finding matters most as another data point in a large literature. Its value is in reducing uncertainty, which is a slower and less dramatic story than a headline reversal.",
      },
    ],
  },

  {
    id: "story-central-bank",
    slug: "central-bank-monetary-policy-decision",
    title: "A central bank holds its benchmark interest rate and signals a cautious path",
    summary:
      "A central bank has kept its policy rate unchanged and published guidance describing future moves as data-dependent. Coverage agrees on the decision and the vote but differs on whether the guidance leans toward cuts, and on who is most affected.",
    category: "Economics",
    publishedAt: "2026-04-17T12:00:00Z",
    updatedAt: "2026-04-17T18:00:00Z",
    coverage: { left: 26, center: 48, right: 26 },
    commonFacts: [
      "The central bank held its benchmark rate unchanged at this meeting.",
      "The published statement describes future decisions as dependent on incoming data.",
      "The rate-setting committee's vote was not unanimous.",
      "Updated projections show inflation returning toward target over the bank's stated horizon.",
    ],
    coverageDifferences: [
      {
        topic: "Reading of the forward guidance",
        observations: [
          {
            publication: "The Meridian",
            emphasis:
              "Describes the guidance as balanced and quotes economists on both a summer cut and a longer hold.",
          },
          {
            publication: "Capital Ledger",
            emphasis:
              "Reads the tone as leaning toward a cut and highlights the dissenting votes in favour of easing.",
          },
          {
            publication: "The Standard Record",
            emphasis:
              "Emphasises the committee members who wanted to keep rates higher for longer.",
          },
        ],
      },
      {
        topic: "Who is centred as affected",
        observations: [
          {
            publication: "Vantage Daily",
            emphasis:
              "Leads with mortgage holders and renters and includes case studies of household budgets.",
          },
          {
            publication: "Capital Ledger",
            emphasis:
              "Leads with bond yields, bank margins and equity-market reaction.",
          },
          {
            publication: "Heartland Monitor",
            emphasis:
              "Leads with small-business borrowing costs and regional housing markets.",
          },
        ],
      },
      {
        topic: "Political framing",
        observations: [
          {
            publication: "The Commons Review",
            emphasis:
              "Frames the hold as excess caution that prioritises asset holders over employment.",
          },
          {
            publication: "The Standard Record",
            emphasis:
              "Frames it as appropriate discipline against a government tempted to overspend.",
          },
          {
            publication: "Northlight Public Broadcasting",
            emphasis:
              "Keeps to the statement, the projections and attributed reaction from the finance ministry and opposition.",
          },
        ],
      },
    ],
    articles: [
      {
        id: "art-cb-1",
        publication: "Dispatch Wire",
        headline: "Central bank holds benchmark rate; guidance stays data-dependent",
        url: "https://www.dispatchwire.example",
        publishedAt: "2026-04-17T12:10:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "The rate was held after a split vote. Updated projections show inflation returning to target over the bank's horizon. The statement gave no firm date for the next move.",
      },
      {
        id: "art-cb-2",
        publication: "The Meridian",
        headline: "Rates on hold: a deliberately balanced message",
        url: "https://www.themeridian.example",
        publishedAt: "2026-04-17T14:35:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "Economists were divided on timing. Several read the statement as keeping a summer cut open without committing to one.",
      },
      {
        id: "art-cb-3",
        publication: "Capital Ledger",
        headline: "Dissents hint the next move is down",
        url: "https://www.capitalledger.example",
        publishedAt: "2026-04-17T15:50:00Z",
        perspective: "right",
        reliability: "high",
        excerpt:
          "Two members voted to cut now. Markets nudged forward the expected timing of the first reduction; yields slipped on the day.",
      },
      {
        id: "art-cb-4",
        publication: "Vantage Daily",
        headline: "Another month of high rates for mortgage holders as bank waits",
        url: "https://www.vantagedaily.example",
        publishedAt: "2026-04-17T16:20:00Z",
        perspective: "left",
        reliability: "mixed",
        excerpt:
          "For households refinancing this year, the hold means little immediate relief. Advocates said the burden falls hardest on recent buyers and lower-income renters.",
      },
      {
        id: "art-cb-5",
        publication: "The Standard Record",
        headline: "Central bank resists pressure to ease",
        url: "https://www.standardrecord.example",
        publishedAt: "2026-04-17T17:10:00Z",
        perspective: "right",
        reliability: "mixed",
        excerpt:
          "Members favouring a longer hold argued that cutting too early risks a second inflation wave, especially given planned government spending.",
      },
    ],
  },

  {
    id: "story-water-rules",
    slug: "regulator-proposes-industrial-water-reuse-standards",
    title: "An environmental regulator proposes new industrial water-reuse standards",
    summary:
      "A national environmental regulator has opened a consultation on standards that would require large industrial water users to treat and reuse a minimum share of process water. The proposal is at the consultation stage; coverage differs on cost estimates and on how strict the final rule is likely to be.",
    category: "Environment",
    publishedAt: "2026-05-06T10:00:00Z",
    updatedAt: "2026-05-07T13:15:00Z",
    coverage: { left: 34, center: 41, right: 25 },
    commonFacts: [
      "The regulator has published a draft rule and opened a public consultation with a stated closing date.",
      "The draft would apply to industrial facilities above a defined water-use threshold.",
      "The proposal includes a phase-in period before full compliance is required.",
      "The regulator's own impact assessment presents a range of cost estimates rather than a single figure.",
    ],
    coverageDifferences: [
      {
        topic: "Cost estimates emphasised",
        observations: [
          {
            publication: "Capital Ledger",
            emphasis:
              "Leads with the high end of the industry's cost estimate and warns of effects on competitiveness.",
          },
          {
            publication: "Northlight Public Broadcasting",
            emphasis:
              "Reports the regulator's cost range and the industry estimate side by side, noting they use different assumptions.",
          },
          {
            publication: "The Commons Review",
            emphasis:
              "Leads with avoided environmental costs and long-run water security, treating compliance cost as an investment.",
          },
        ],
      },
      {
        topic: "Likely stringency of the final rule",
        observations: [
          {
            publication: "The Meridian",
            emphasis:
              "Notes that consultation drafts are frequently softened and quotes a former regulator on typical revisions.",
          },
          {
            publication: "Vantage Daily",
            emphasis:
              "Frames the draft as a floor that campaigners will push to strengthen.",
          },
          {
            publication: "The Standard Record",
            emphasis:
              "Frames it as regulatory overreach likely to be challenged and diluted.",
          },
        ],
      },
      {
        topic: "Affected parties centred",
        observations: [
          {
            publication: "Heartland Monitor",
            emphasis:
              "Centres regional manufacturers and the jobs tied to affected plants.",
          },
          {
            publication: "Atlas & Globe",
            emphasis:
              "Centres downstream communities and ecosystems affected by current discharge levels.",
          },
          {
            publication: "Frontier Tech Journal",
            emphasis:
              "Centres water-treatment technology vendors and the readiness of available systems.",
          },
        ],
      },
    ],
    articles: [
      {
        id: "art-water-1",
        publication: "Northlight Public Broadcasting",
        headline: "Regulator opens consultation on industrial water-reuse standards",
        url: "https://www.northlight.example",
        publishedAt: "2026-05-06T10:25:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "The draft rule would set a minimum reuse share for large industrial water users, with a phase-in period. The regulator's impact assessment gives a range of cost estimates.",
      },
      {
        id: "art-water-2",
        publication: "Capital Ledger",
        headline: "Proposed water rules could cost industry billions, trade group says",
        url: "https://www.capitalledger.example",
        publishedAt: "2026-05-06T14:00:00Z",
        perspective: "right",
        reliability: "high",
        excerpt:
          "An industry association put compliance costs well above the regulator's midpoint, warning some facilities could relocate. The regulator disputed the assumptions behind that figure.",
      },
      {
        id: "art-water-3",
        publication: "The Commons Review",
        headline: "Treating water reuse as a cost misses the point",
        url: "https://www.commonsreview.example",
        publishedAt: "2026-05-06T19:30:00Z",
        perspective: "left",
        reliability: "mixed",
        excerpt:
          "The draft standard is modest given projected water stress. The framing that matters is what continued high-volume discharge costs communities downstream.",
      },
      {
        id: "art-water-4",
        publication: "The Meridian",
        headline: "Water-reuse proposal enters consultation; expect changes",
        url: "https://www.themeridian.example",
        publishedAt: "2026-05-07T09:10:00Z",
        perspective: "center",
        reliability: "high",
        excerpt:
          "A former regulator said drafts at this stage typically shift on thresholds and timelines before adoption, and that the core reuse requirement is likely to survive in some form.",
      },
      {
        id: "art-water-5",
        publication: "Signal Brief",
        headline: "New water rules on the way for factories",
        url: "https://www.signalbrief.example",
        publishedAt: "2026-05-06T11:40:00Z",
        perspective: "center",
        reliability: "unknown",
        excerpt:
          "Large industrial sites will have to reuse more of their water under standards announced by the regulator.",
      },
    ],
  },
];

const storyBySlug = new Map(STORIES.map((s) => [s.slug, s]));

export function storyForSlug(slug: string): StoryCluster | undefined {
  return storyBySlug.get(slug);
}

export const CATEGORIES: string[] = Array.from(
  new Set(STORIES.map((s) => s.category)),
).sort();
