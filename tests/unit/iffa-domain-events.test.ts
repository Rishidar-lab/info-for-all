import { describe, it, expect } from "vitest";
import { detectPolicyEvent, isMarketReaction, sameMarketMove } from "@/lib/domain/finance";
import { detectFixture, sameSportsFixture } from "@/lib/domain/sports";

describe("IFFA finance event state (v0.9 Phase O)", () => {
  it("reads an RBI hold as a policy decision, not a market reaction", () => {
    const p = detectPolicyEvent("RBI keeps repo rate unchanged at 6.5% for the fourth straight meeting");
    expect(p?.authority).toBe("RBI");
    expect(p?.instrument).toBe("repo rate");
    expect(p?.decision).toBe("hold");
    expect(isMarketReaction("RBI keeps repo rate unchanged at 6.5%")).toBe(false);
  });

  it("reads a rate cut with its size", () => {
    const p = detectPolicyEvent("RBI cuts repo rate by 25 bps to 6.25%, effective immediately");
    expect(p?.decision).toBe("cut");
    expect(p?.changeBps).toBe(25);
  });

  it("keeps a market reaction distinct from the decision", () => {
    expect(isMarketReaction("Sensex jumps 900 points after RBI holds repo rate")).toBe(true);
    // the decision is still recoverable from the same text
    const p = detectPolicyEvent("Sensex jumps 900 points after RBI holds repo rate");
    expect(p?.decision).toBe("hold");
  });

  it("does not treat a VRRR liquidity auction as a rate decision", () => {
    expect(detectPolicyEvent("RBI to conduct Variable Rate Reverse Repo (VRRR) auction on Friday")).toBeUndefined();
  });

  it("points and percent are never the same move", () => {
    expect(sameMarketMove("Sensex falls 500 points", "Sensex falls 500%")).toBe(false);
  });
});

describe("IFFA sports fixture state (v0.9 Phase P)", () => {
  it("a league-stage win and a final between the same teams are different fixtures", () => {
    const league = detectFixture("CSK beat RCB in the IPL league stage");
    const final = detectFixture("CSK beat RCB in the IPL final to lift the trophy");
    expect(league.round).toBe("league stage");
    expect(final.round).toBe("final");
    expect(sameSportsFixture(league, final)).toBe(false);
  });

  it("reads fixture status from the reporting", () => {
    expect(detectFixture("India will face Australia in the second Test from Friday").status).toBe("scheduled");
    expect(detectFixture("Rain delay: toss delayed at the Chepauk as covers stay on").status).toBe("delayed");
    expect(detectFixture("Match abandoned due to rain, points shared").status).toBe("abandoned");
    expect(detectFixture("IPL final postponed to Sunday after Chennai storm").status).toBe("postponed");
    expect(detectFixture("India beat Australia by 6 wickets to seal the series").status).toBe("completed");
  });

  it("extracts the result of a completed match", () => {
    const f = detectFixture("India beat New Zealand by 21 runs in the T20 series decider");
    expect(f.status).toBe("completed");
    expect(f.result?.margin).toMatch(/21 runs/);
  });

  it("men's and women's fixtures never merge", () => {
    const men = detectFixture("India beat Sri Lanka in the Asia Cup");
    const women = detectFixture("India beat Sri Lanka in the Women's Asia Cup");
    expect(sameSportsFixture(men, women)).toBe(false);
  });

  it("a bare 'world cup' near football is not the Cricket World Cup", () => {
    const f = detectFixture("The FIFA World Cup deserved Lionel Messi");
    expect(f.competition).not.toBe("Cricket World Cup");
  });
});
