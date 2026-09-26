import { afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";
import { signAccessToken } from "../src/utils/jwt.js";
import { prisma } from "../src/config/prisma.js";

describe("auth endpoints", () => {
  const email = `test.user.${Date.now()}@example.com`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it("signs up a new user", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Test User", email, password: "Password123!" });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("token");
    expect(response.body.user.email).toBe(email);
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
});
