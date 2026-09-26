/**
 * Feature 3 — Course Management
 * Spec: features/feature-3-course-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser, createUserWithRole } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const validCourse = (overrides = {}) => ({
  name: "Programming II",
  number: "COMP-2100",
  description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
  semesters: ["Fall"],
  frequency: "Yearly",
  hours: 3,
  department: "Computer Science",
  ...overrides,
});

let adminToken;
let studentToken;

const createCourse = (overrides = {}, token = adminToken) =>
  request(app).post("/api/courses").set(bearer(token)).send(validCourse(overrides));

const listCourses = (query = {}, token = adminToken) =>
  request(app).get("/api/courses").query(query).set(bearer(token));

const numbersOf = (response) => response.body.items.map((course) => course.number);

beforeEach(async () => {
  await syncTestDatabase();
  adminToken = (await createUserWithRole("admin", { email: "admin@example.com", firstName: "Ada" })).body.token;
  studentToken = (await registerUser({ email: "student@example.com", firstName: "Sam" })).body.token;
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 3 — Course Management API", () => {
  describe("US-3.1 — Create courses", () => {
    it("Admin user creates a new course", async () => {
      await createCourse({ name: "Calculus I", number: "MATH-1100" });

      const response = await createCourse({ name: "  Programming II  ", number: " COMP-2100 " });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: "Programming II",
        number: "COMP-2100",
        description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
        semesters: ["Fall"],
        frequency: "Yearly",
        hours: 3,
        department: "Computer Science",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const list = await listCourses();
      expect(numbersOf(list)).toEqual(["COMP-2100", "MATH-1100"]);
    });

    it("User creates a course with an empty required field", async () => {
      for (const field of ["name", "number", "description", "semesters", "frequency", "hours", "department"]) {
        const missing = validCourse();
        delete missing[field];

        const response = await request(app).post("/api/courses").set(bearer(adminToken)).send(missing);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: expect.stringMatching(new RegExp(field, "i")) });
      }

      const whitespace = await createCourse({ name: "   " });
      expect(whitespace.status).toBe(400);

      expect(await db.course.count()).toBe(0);
    });

    it("User creates a course with invalid formatted fields", async () => {
      const badNumber = await createCourse({ number: "CS210" });
      expect(badNumber.status).toBe(400);
      expect(badNumber.body.message).toMatch(/XXXX-####/);

      const longName = await createCourse({ name: "a".repeat(256) });
      expect(longName.status).toBe(400);

      const badFrequency = await createCourse({ frequency: "Every Other Tuesday" });
      expect(badFrequency.status).toBe(400);

      for (const semesters of ["Fall", [], ["Monsoon"]]) {
        const response = await createCourse({ semesters });
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/semester/i);
      }

      for (const hours of [2.5, 0, -1, "abc"]) {
        const response = await createCourse({ hours });
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/hours/i);
      }

      expect(await db.course.count()).toBe(0);
    });
  });

  describe("US-3.2 — View courses", () => {
    it("Courses view loads with existing courses", async () => {
      await createCourse({ name: "Calculus I", number: "MATH-1100" });
      await createCourse({ name: "Programming II", number: "COMP-2100" });
      await createCourse({ name: "Composition", number: "ENGL-1010", department: "English" });

      const response = await listCourses();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 3, page: 1, pageSize: 20, pageCount: 1 });
      expect(numbersOf(response)).toEqual(["COMP-2100", "ENGL-1010", "MATH-1100"]);

      const single = await request(app).get(`/api/courses/${response.body.items[1].id}`).set(bearer(adminToken));
      expect(single.status).toBe(200);
      expect(single.body).toMatchObject({ number: "ENGL-1010", name: "Composition" });

      const missing = await request(app).get("/api/courses/9999").set(bearer(adminToken));
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ message: expect.any(String) });
    });

    it("Non-admin user views courses", async () => {
      await createCourse();

      const list = await listCourses({}, studentToken);
      expect(list.status).toBe(200);
      expect(list.body.items).toHaveLength(1);
      expect(list.body.items[0]).toMatchObject({ number: "COMP-2100" });

      const create = await createCourse({ number: "COMP-3100" }, studentToken);
      expect(create.status).not.toBe(201);
      expect(await db.course.count()).toBe(1);
    });
  });

  describe("US-3.3 — Search/filter/paginate courses", () => {
    it("Admin searches for a specific course", async () => {
      await createCourse({ name: "Programming II", number: "COMP-2100" });
      await createCourse({ name: "Composition", number: "ENGL-1010", department: "English" });
      await createCourse({ name: "Calculus I", number: "MATH-1100", department: "Engineering" });

      const byNumber = await listCourses({ q: "COMP-" });
      expect(byNumber.status).toBe(200);
      expect(numbersOf(byNumber)).toEqual(["COMP-2100"]);
      expect(byNumber.body.total).toBe(1);

      const byName = await listCourses({ q: "composition" });
      expect(numbersOf(byName)).toEqual(["ENGL-1010"]);

      const byDepartment = await listCourses({ q: "engineering" });
      expect(numbersOf(byDepartment)).toEqual(["MATH-1100"]);

      // LIKE wildcards in the search are matched literally.
      const wildcard = await listCourses({ q: "%" });
      expect(wildcard.body.items).toEqual([]);
    });

    it("Multi-word search matches every word", async () => {
      await createCourse({ name: "Programming I", number: "COMP-1100" });
      await createCourse({ name: "Programming II", number: "COMP-2100" });

      const response = await listCourses({ q: "programming 2100" });

      expect(numbersOf(response)).toEqual(["COMP-2100"]);
    });

    it("Users filter courses", async () => {
      await createCourse({ number: "COMP-1100", semesters: ["Fall"], frequency: "Yearly" });
      await createCourse({ number: "COMP-2100", semesters: ["Spring", "Summer"], frequency: "Odd Years" });
      await createCourse({
        number: "ENGL-1010",
        department: "English",
        semesters: ["Winter"],
        frequency: "Even Years",
      });

      const byDepartment = await listCourses({ department: "English" });
      expect(numbersOf(byDepartment)).toEqual(["ENGL-1010"]);

      const bySemesterList = await listCourses({ semester: "Fall,Summer" });
      expect(numbersOf(bySemesterList)).toEqual(["COMP-1100", "COMP-2100"]);

      const repeated = await request(app)
        .get("/api/courses?frequency=Yearly&frequency=Even%20Years")
        .set(bearer(adminToken));
      expect(numbersOf(repeated)).toEqual(["COMP-1100", "ENGL-1010"]);

      const combined = await listCourses({ department: "Computer Science", semester: "Spring", q: "COMP" });
      expect(numbersOf(combined)).toEqual(["COMP-2100"]);
    });

    it("Users sort courses", async () => {
      await createCourse({ name: "Beta", number: "COMP-1100", hours: 3 });
      await createCourse({ name: "Alpha", number: "COMP-2100", hours: 4 });
      await createCourse({ name: "Gamma", number: "COMP-3100", hours: 3 });

      const byName = await listCourses({ sort: "name" });
      expect(numbersOf(byName)).toEqual(["COMP-2100", "COMP-1100", "COMP-3100"]);

      // Ties on hours fall back to id order.
      const byHoursDesc = await listCourses({ sort: "-hours" });
      expect(numbersOf(byHoursDesc)).toEqual(["COMP-2100", "COMP-1100", "COMP-3100"]);
    });

    it("Invalid filter or sort values are rejected", async () => {
      for (const query of [
        { department: "Underwater Basket Weaving" },
        { semester: "Monsoon" },
        { frequency: "Every Other Tuesday" },
        { sort: "createdAt" },
      ]) {
        const response = await listCourses(query);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: expect.any(String) });
      }
    });

    it("Admin paginates through courses", async () => {
      for (let i = 1; i <= 25; i += 1) {
        await createCourse({ name: `Course ${i}`, number: `COMP-${1000 + i}` });
      }

      const first = await listCourses();
      expect(first.body).toMatchObject({ total: 25, page: 1, pageSize: 20, pageCount: 2 });
      expect(first.body.items).toHaveLength(20);
      expect(first.body.items[0].number).toBe("COMP-1001");

      const second = await listCourses({ page: 2 });
      expect(second.body).toMatchObject({ total: 25, page: 2, pageCount: 2 });
      expect(numbersOf(second)).toEqual(["COMP-1021", "COMP-1022", "COMP-1023", "COMP-1024", "COMP-1025"]);

      const small = await listCourses({ page: 3, pageSize: 5 });
      expect(small.body).toMatchObject({ page: 3, pageSize: 5, pageCount: 5 });
      expect(numbersOf(small)).toEqual(["COMP-1011", "COMP-1012", "COMP-1013", "COMP-1014", "COMP-1015"]);

      const clamped = await listCourses({ page: 0, pageSize: 1000 });
      expect(clamped.body).toMatchObject({ page: 1, pageSize: 100, pageCount: 1 });
      expect(clamped.body.items).toHaveLength(25);

      const pastEnd = await listCourses({ page: 9 });
      expect(pastEnd.status).toBe(200);
      expect(pastEnd.body.items).toEqual([]);
    });
  });

  describe("US-3.5 — Edit and delete courses", () => {
    it("Admin edits a course", async () => {
      const { body: created } = await createCourse({ name: "Programming I", number: "COMP-1100" });

      const response = await request(app)
        .put(`/api/courses/${created.id}`)
        .set(bearer(adminToken))
        .send(validCourse({ name: "Programming I", number: "COMP-1100", semesters: ["Winter"] }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.id,
        name: "Programming I",
        number: "COMP-1100",
        semesters: ["Winter"],
      });

      const stored = await db.course.findByPk(created.id);
      expect(stored.semesters).toEqual(["Winter"]);

      // Edits go through the same validation as creates.
      const invalid = await request(app)
        .put(`/api/courses/${created.id}`)
        .set(bearer(adminToken))
        .send(validCourse({ number: "COMP-1100", semesters: "Fall" }));
      expect(invalid.status).toBe(400);
      expect((await db.course.findByPk(created.id)).semesters).toEqual(["Winter"]);
    });

    it("Admin deletes a course", async () => {
      const { body: created } = await createCourse();

      const response = await request(app).delete(`/api/courses/${created.id}`).set(bearer(adminToken));

      expect([200, 204]).toContain(response.status);
      expect(await db.course.findByPk(created.id)).toBeNull();

      const list = await listCourses();
      expect(list.body).toEqual({ items: [], total: 0, page: 1, pageSize: 20, pageCount: 0 });
    });

    it("Non-admin attempts to edit or delete a course via API", async () => {
      const { body: created } = await createCourse();

      const update = await request(app)
        .put(`/api/courses/${created.id}`)
        .set(bearer(studentToken))
        .send(validCourse({ name: "Hijacked" }));
      expect(update.status).toBe(403);
      expect(update.body).toEqual({ message: "Not Authorized." });

      const remove = await request(app).delete(`/api/courses/${created.id}`).set(bearer(studentToken));
      expect(remove.status).toBe(403);
      expect(remove.body).toEqual({ message: "Not Authorized." });

      const stored = await db.course.findByPk(created.id);
      expect(stored.name).toBe("Programming II");
    });

    it("Unauthenticated API request to courses", async () => {
      const response = await request(app).get("/api/courses");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });
});
