import { afterAll, describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";
import { signAccessToken } from "../src/utils/jwt.js";
import { prisma } from "../src/config/prisma.js";

const { sendVerificationEmailMock } = vi.hoisted(() => ({
  sendVerificationEmailMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/services/emailService.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/emailService.js")>();
  return { ...actual, sendEmailVerification: sendVerificationEmailMock };
});

describe("auth endpoints", () => {
  const email = `test.user.${Date.now()}@example.com`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it("signs up a new user", async () => {
    sendVerificationEmailMock.mockClear();
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Test User", email, password: "Password123!" });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe(email);
    expect(response.body).not.toHaveProperty("token");
    const firstUrl = (sendVerificationEmailMock.mock.calls[0] as [string, string])[1];
    const firstToken = new URL(firstUrl).searchParams.get("token");
    expect(firstToken).toBeTruthy();

    const resent = await request(app).post("/api/auth/resend-verification").send({ email });
    expect(resent.status).toBe(200);
    expect(resent.body.status).toBe("sent");
    const replacementUrl = (sendVerificationEmailMock.mock.calls[1] as [string, string])[1];
    const replacementToken = new URL(replacementUrl).searchParams.get("token");
    expect(replacementToken).toBeTruthy();
    expect(replacementToken).not.toBe(firstToken);

    const invalidated = await request(app).post("/api/auth/verify-email").send({ token: firstToken });
    expect(invalidated.status).toBe(400);

    const verified = await request(app).post("/api/auth/verify-email").send({ token: replacementToken });
    expect(verified.status).toBe(200);
    expect(verified.body.status).toBe("verified");

    const repeated = await request(app).post("/api/auth/verify-email").send({ token: replacementToken });
    expect(repeated.body.status).toBe("already_verified");
  });

  it("logs in an existing user", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "Password123!" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body.user.email).toBe(email);
  });

  it("ignores undefined document filters instead of passing them to Prisma", async () => {
    const token = signAccessToken({ id: "user-1", email, role: "WAREHOUSE_STAFF" });

    const response = await request(app)
      .get("/api/documents?type=transfer&status=undefined&warehouseId=undefined")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it.each([
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
  ])("allows the local development origin %s", async (origin) => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(response.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("does not allow an unrelated development origin", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", "http://example.invalid")
      .set("Access-Control-Request-Method", "POST");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
