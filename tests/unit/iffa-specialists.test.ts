import { describe, it, expect } from "vitest";
import {
  detectFinanceInstruments,
  parseMarketMoves,
  sameMarketMove,
} from "../../src/lib/domain/finance";
import { detectCompetition, detectTeams, detectFixture, sameSportsFixture } from "../../src/lib/domain/sports";

describe("IFFA finance semantics (Phase G)", () => {
  it("recognises the major instruments", () => {
    expect(detectFinanceInstruments("Sensex and Nifty end higher; rupee steady")).toEqual(
      expect.arrayContaining(["Sensex", "Nifty 50", "Indian rupee"]),
    );
    expect(detectFinanceInstruments("Gold price hits record; crude oil slips")).toEqual(
      expect.arrayContaining(["Gold", "Crude oil"]),
    );
  });

  it("keeps points and percent as different units", () => {
    const pts = parseMarketMoves("Sensex jumps 1,200 points")[0];
    const pct = parseMarketMoves("Sensex jumps 1.8 per cent")[0];
    expect(pts.unit).toBe("points");
    expect(pts.value).toBe(1200);
    expect(pct.unit).toBe("percent");
    expect(pct.value).toBe(1.8);
    expect(sameMarketMove("Sensex jumps 1,200 points", "Sensex jumps 1,200 per cent")).toBe(false);
  });

  it("reads direction from the surrounding words", () => {
    expect(parseMarketMoves("Nifty tanks 300 points")[0].direction).toBe("down");
    expect(parseMarketMoves("Nifty rallies 300 points")[0].direction).toBe("up");
    expect(parseMarketMoves("Nifty ends flat, down just 5 points")[0].direction).toBe("flat");
  });

  it("basis points are their own unit", () => {
    const m = parseMarketMoves("RBI cuts repo rate by 25 bps")[0];
    expect(m.unit).toBe("bps");
    expect(m.value).toBe(25);
  });
});

describe("IFFA sports semantics (Phase G)", () => {
  it("detects competition and teams", () => {
    expect(detectCompetition("CSK beat RCB in IPL clash")?.canonical).toBe("IPL");
    expect(detectTeams("CSK beat RCB").sort()).toEqual(["CSK", "RCB"]);
  });

  it("same competition + teams + date is one fixture", () => {
    const a = detectFixture("CSK beat RCB in a thriller, IPL", "2026-04-05");
    const b = detectFixture("RCB fall to CSK in IPL last-over finish", "2026-04-05");
    expect(sameSportsFixture(a, b)).toBe(true);
  });

  it("different dates are different fixtures", () => {
    expect(
      sameSportsFixture(
        detectFixture("CSK beat RCB, IPL", "2026-04-05"),
        detectFixture("CSK beat RCB, IPL", "2026-05-01"),
      ),
    ).toBe(false);
  });

  it("different competitions never merge", () => {
    expect(
      sameSportsFixture(
        detectFixture("India beat Australia in the T20I series"),
        detectFixture("India beat Australia in the Test series"),
      ),
    ).toBe(false);
  });

  it("men's and women's fixtures never merge", () => {
    expect(
      sameSportsFixture(
        detectFixture("India beat England in the first ODI"),
        detectFixture("India Women beat England Women in the first ODI"),
      ),
    ).toBe(false);
  });

  it("junior and senior fixtures never merge", () => {
    expect(
      sameSportsFixture(
        detectFixture("India beat Pakistan in the Asia Cup"),
        detectFixture("India U-19 beat Pakistan U-19 in the Asia Cup"),
      ),
    ).toBe(false);
  });
});
