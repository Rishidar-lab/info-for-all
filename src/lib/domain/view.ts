import type {
  CgiBand,
  ClaimRelationshipType,
  ClaimStatus,
  ClaimType,
  EvidenceType,
  TimelineEntryType,
} from "./types";

/** Serialised shapes returned by the domain layer and the API (dates as ISO strings). */

export interface SourceView {
  id: string;
  name: string;
  domain: string;
  country: string | null;
  language: string | null;
  orgType: string | null;
  category: string | null;
  parentCompany: string | null;
  ownershipGroup: string | null;
  foundedYear: number | null;
  websiteUrl: string | null;
  wikipediaUrl: string | null;
  aboutUrl: string | null;
  publishesPrimarySources: boolean;
  isDemo: boolean;
  articleCount?: number;
}

export interface ArticleView {
  id: string;
  url: string;
  canonicalUrl: string | null;
  title: string;
  description: string | null;
  contentExcerpt: string | null;
  publication: string;
  author: string | null;
  publishedAt: string;
  language: string;
  imageUrl: string | null;
  wireService: string | null;
  isDemo: boolean;
  source: Pick<
    SourceView,
    "id" | "name" | "domain" | "country" | "orgType" | "category" | "ownershipGroup" | "parentCompany"
  > | null;
  role?: string | null;
  similarity?: number | null;
  independenceClusterId?: number | null;
}

export interface EvidenceView {
  id: string;
  url: string;
  title: string;
  publisher: string | null;
  type: EvidenceType;
  isPrimary: boolean;
  publishedAt: string | null;
  archiveUrl: string | null;
  contentHash: string | null;
  isDemo: boolean;
  linkedClaims: { claimId: string; stance: string; note: string | null }[];
}

export interface ClaimView {
  id: string;
  canonicalText: string;
  originalText: string;
  normalizedMeaning: string | null;
  type: ClaimType;
  status: ClaimStatus;
  extractionConfidence: number;
  evidenceStatus: string;
  corroborationCount: number;
  contradictionCount: number;
  isKeyClaim: boolean;
  sourceParagraph: number | null;
  sourceArticle: { id: string; title: string; publication: string; url: string } | null;
  supportingArticles: { id: string; title: string; publication: string; url: string; publishedAt: string }[];
  evidence: EvidenceView[];
  relationships: {
    id: string;
    type: ClaimRelationshipType;
    direction: "from" | "to";
    otherClaimId: string;
    otherClaimText: string;
    confidence: number;
    rationale: string | null;
  }[];
}

export interface TimelineEntryView {
  id: string;
  occurredAt: string;
  headline: string;
  detail: string | null;
  type: TimelineEntryType;
  confidence: number;
  sourceArticle: { id: string; title: string; url: string } | null;
}

export interface CgiComponentView {
  key: string;
  label: string;
  rawValue: number;
  weight: number;
  contribution: number;
  direction: "positive" | "negative";
  explanation: string;
}

export interface CgiView {
  score: number;
  band: CgiBand;
  bandLabel: string;
  formulaVersion: string;
  base: number;
  computedAt: string;
  components: CgiComponentView[];
  inputs: Record<string, number>;
  narrative: { positives: string[]; negatives: string[] };
}

export interface EventSummaryView {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  location: string | null;
  status: string;
  startedAt: string;
  latestUpdateAt: string;
  isDemo: boolean;
  sourceCount: number;
  articleCount: number;
  corroboratedClaimCount: number;
  disputedClaimCount: number;
  primaryEvidenceCount: number;
  cgi: { score: number; band: CgiBand; bandLabel: string } | null;
  topics: { slug: string; name: string }[];
}

export interface EventDetailView extends EventSummaryView {
  clusteringMethod: string | null;
  cgi: CgiView | null;
  whatWeKnow: string;
  agreement: ClaimView[];
  disagreement: {
    contradiction: {
      id: string;
      confidence: number;
      rationale: string | null;
      claimA: ClaimView;
      claimB: ClaimView;
    }[];
  };
  uncertainties: { label: string; detail: string }[];
  primaryEvidence: EvidenceView[];
  timeline: TimelineEntryView[];
  coverage: ArticleView[];
  claims: ClaimView[];
  entities: { id: string; name: string; type: string; salience: number }[];
  corrections: {
    id: string;
    originalText: string;
    updatedText: string;
    reason: string;
    correctedAt: string;
    sourceUrl: string | null;
  }[];
  independence: {
    totalArticles: number;
    independentCount: number;
    independenceRatio: number;
    ownershipGroups: string[];
    wireDependentArticles: number;
  };
}
