import { describe, expect, it } from "vitest";
import {
  allCodes,
  computeScore,
  dailyCode,
  filterCandidates,
  isValidCode,
  pickGuess,
  randomCode,
  scoreGuess,
} from "./logic";

describe("scoreGuess", () => {
  it("брои бикове и крави", () => {
    expect(scoreGuess("1234", "1234")).toEqual({ bulls: 4, cows: 0 });
    expect(scoreGuess("4321", "1234")).toEqual({ bulls: 0, cows: 4 });
    expect(scoreGuess("1243", "1234")).toEqual({ bulls: 2, cows: 2 });
    expect(scoreGuess("5678", "1234")).toEqual({ bulls: 0, cows: 0 });
  });
});

describe("isValidCode", () => {
  it("иска различни цифри и ненулево начало", () => {
    expect(isValidCode("1234", 4)).toBe(true);
    expect(isValidCode("0123", 4)).toBe(false);
    expect(isValidCode("1123", 4)).toBe(false);
    expect(isValidCode("123", 4)).toBe(false);
    expect(isValidCode("12a4", 4)).toBe(false);
  });
});

describe("allCodes", () => {
  it("дава точния брой валидни числа", () => {
    expect(allCodes(3).length).toBe(9 * 9 * 8);
    expect(allCodes(4).length).toBe(9 * 9 * 8 * 7);
    expect(allCodes(4).every((c) => isValidCode(c, 4))).toBe(true);
  });
});

describe("randomCode / dailyCode", () => {
  it("генерира валидни числа", () => {
    for (let i = 0; i < 200; i++) expect(isValidCode(randomCode(4), 4)).toBe(true);
  });
  it("числото на деня е детерминистично", () => {
    expect(dailyCode(4, "2026-10-18")).toBe(dailyCode(4, "2026-10-18"));
    expect(dailyCode(4, "2026-10-18")).not.toBe(dailyCode(4, "2026-10-19"));
  });
});

describe("solver", () => {
  it("познава всяко число за най-много 8 опита", () => {
    const codes = allCodes(4);
    const rng = (() => {
      let s = 42;
      return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    })();
    for (let k = 0; k < 40; k++) {
      const secret = codes[Math.floor(rng() * codes.length)];
      let cands = codes;
      let guess = "1234";
      let tries = 0;
      const history = [];
      while (guess !== secret) {
        const v = scoreGuess(guess, secret);
        history.push({ guess, ...v });
        cands = filterCandidates(cands, history);
        guess = pickGuess(cands, rng);
        tries++;
        expect(tries).toBeLessThanOrEqual(8);
      }
    }
  });
});

describe("computeScore", () => {
  it("награждава малко опити и бързина", () => {
    const fast = computeScore(4, 4, 60_000);
    const par = computeScore(4, 6, 120_000);
    const slow = computeScore(4, 9, 300_000);
    expect(fast.score).toBeGreaterThan(par.score);
    expect(par.score).toBeGreaterThan(slow.score);
    expect(fast.stars).toBe(5);
    expect(par.stars).toBe(3);
    expect(slow.stars).toBe(1);
    expect(computeScore(4, 6, 300_000).score).toBe(1000);
  });
});
