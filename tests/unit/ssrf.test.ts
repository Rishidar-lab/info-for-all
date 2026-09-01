import { describe, expect, it } from "vitest";
import { assertSafeUrl, isBlockedAddress, isPrivateIPv4, isPrivateIPv6 } from "@/lib/ingestion/ssrf";

describe("isPrivateIPv4", () => {
  it("blocks loopback, RFC1918, link-local and CGNAT ranges", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.4.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0"]) {
      expect(isPrivateIPv4(ip)).toBe(true);
    }
  });
  it("allows public addresses", () => {
    expect(isPrivateIPv4("93.184.216.34")).toBe(false);
    expect(isPrivateIPv4("8.8.8.8")).toBe(false);
  });
});

describe("isPrivateIPv6", () => {
  it("blocks loopback and unique-local", () => {
    expect(isPrivateIPv6("::1")).toBe(true);
    expect(isPrivateIPv6("fd00::1")).toBe(true);
    expect(isPrivateIPv6("fe80::1")).toBe(true);
  });
  it("maps embedded IPv4", () => {
    expect(isBlockedAddress("::ffff:127.0.0.1")).toBe(true);
  });
});

describe("assertSafeUrl", () => {
  it("rejects non-http(s) schemes", async () => {
    await expect(assertSafeUrl("ftp://example.com/x")).rejects.toThrow();
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow();
  });
  it("rejects embedded credentials", async () => {
    await expect(assertSafeUrl("https://user:pass@example.com/x")).rejects.toThrow();
  });
  it("rejects localhost and internal hostnames", async () => {
    await expect(assertSafeUrl("http://localhost:3000/feed")).rejects.toThrow();
    await expect(assertSafeUrl("http://service.internal/feed")).rejects.toThrow();
  });
  it("rejects a literal private address", async () => {
    await expect(assertSafeUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow();
  });
});
