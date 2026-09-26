/**
 * Feature 3 — Course Management
 * Spec: features/feature-3-course-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { VBtn, VDialog, VListItem, VSelect, VTextarea, VTextField } from "vuetify/components";
import App from "../src/App.vue";
import router from "../src/router.js";
import apiClient from "../src/services/services.js";
import { vuetify } from "./testUtils.js";

vi.mock("../src/services/services.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const adminUser = {
  userId: 1,
  email: "admin@example.com",
  firstName: "Ada",
  lastName: "Admin",
  role: "admin",
  token: "admin-token",
};
const studentUser = { ...adminUser, userId: 2, email: "sam@example.com", firstName: "Sam", role: "student" };

let nextId = 1;
const course = (overrides = {}) => ({
  id: nextId++,
  name: "Programming II",
  number: "COMP-2100",
  description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
  semesters: ["Fall"],
  frequency: "Yearly",
  hours: 3,
  department: "Computer Science",
  ...overrides,
});

/** Shape of a `GET /courses` response: one page of items plus pagination metadata. */
const pageOf = (items, { total = items.length, page = 1, pageSize = 20 } = {}) => ({
  data: { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) },
});

/** Params the view sent on its most recent `GET /courses`. */
const lastListParams = () => apiClient.get.mock.calls.at(-1)[1].params;

const apiError = (status, message) => Object.assign(new Error(message), { response: { status, data: { message } } });

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await flushPromises();
  }
};

/** Retry an assertion until it passes (async validation and dialogs settle on timers). */
const waitFor = async (assertion, timeout = 1500) => {
  const start = Date.now();
  for (;;) {
    try {
      return assertion();
    } catch (error) {
      if (Date.now() - start > timeout) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      await flushPromises();
    }
  }
};

let wrapper;

const mountCoursesAs = async (user, courses = [], pagination = {}) => {
  localStorage.setItem("user", JSON.stringify(user));
  apiClient.get.mockResolvedValue(pageOf(courses, pagination));
  await router.push("/");
  await router.isReady();
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [vuetify, router] } });
  await settle();
  return wrapper;
};

/** Dialogs teleport to <body>, so page text is read from the whole document. */
const pageText = () => document.body.textContent;

const openDialog = () => {
  const dialog = wrapper.findAllComponents(VDialog).find((d) => d.props("modelValue"));
  expect(dialog).toBeDefined();
  return dialog;
};

const fieldIn = (dialog, label) => {
  // VSelect renders its own inner VTextField with the same label, so selects must match first.
  const fields = [VSelect, VTextarea, VTextField].flatMap((type) => dialog.findAllComponents(type));
  const found = fields.find((f) => f.props("label") === label);
  expect(found, `field "${label}"`).toBeDefined();
  return found;
};

const setFields = async (dialog, values) => {
  for (const [label, value] of Object.entries(values)) {
    const field = fieldIn(dialog, label);
    if (field.vm.$.type === VSelect) {
      field.vm.$emit("update:modelValue", value);
    } else {
      await field.find(label === "Description" ? "textarea" : "input").setValue(value);
    }
    // CourseForm rebuilds the model from props on every update, so let each change land first.
    await settle();
  }
};

const buttonIn = (scope, text) => {
  const found = scope.findAllComponents(VBtn).find((b) => b.text().trim() === text);
  expect(found, `button "${text}"`).toBeDefined();
  return found;
};

const openAddDialog = async () => {
  await buttonIn(wrapper, "+ New Course").trigger("click");
  await settle();
  return openDialog();
};

const completeCourseForm = {
  Name: "Programming II",
  Number: "COMP-2100",
  "Credit Hours": "3",
  Department: "Computer Science",
  "Semesters Offered": ["Fall"],
  Frequency: "Yearly",
  Description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
};

const searchFor = async (value) => {
  const search = wrapper
    .findAllComponents(VTextField)
    .find((f) => /search/i.test(`${f.props("label") ?? ""} ${f.props("placeholder") ?? ""}`));
  expect(search, "search field").toBeDefined();
  await search.find("input").setValue(value);
  await settle();
};

/** Toolbar filter selects (the course dialog is closed, so its selects aren't rendered). */
const filterSelect = (label) => {
  const found = wrapper.findAllComponents(VSelect).find((f) => f.props("label") === label);
  expect(found, `filter "${label}"`).toBeDefined();
  return found;
};

/** Each course card has an overflow button that opens a menu with Edit / Delete. */
const cardMenus = () => wrapper.findAll('[aria-label="Course actions"]');

/** Menu content teleports to <body>, so items are found by component rather than DOM scope. */
const openCardMenu = async (index = 0) => {
  const menu = cardMenus()[index];
  expect(menu, `"Course actions" button #${index}`).toBeDefined();
  await menu.trigger("click");
  await settle();
};

const menuItem = (title) => {
  const found = wrapper.findAllComponents(VListItem).find((item) => item.props("title") === title);
  expect(found, `menu item "${title}"`).toBeDefined();
  return found;
};

const chooseCardAction = async (index, title) => {
  await openCardMenu(index);
  await waitFor(() => menuItem(title));
  await menuItem(title).trigger("click");
  await settle();
};

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  nextId = 1;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Feature 3 — Course Management UI", () => {
  describe("US-3.1 — Create courses", () => {
    it("Admin user creates a new course", async () => {
      const calculus = course({ name: "Calculus I", number: "MATH-1100" });
      await mountCoursesAs(adminUser, [calculus]);
      const created = course();
      apiClient.post.mockResolvedValueOnce({ data: created });
      apiClient.get.mockResolvedValue(pageOf([created, calculus]));

      const dialog = await openAddDialog();
      await setFields(dialog, completeCourseForm);
      await buttonIn(dialog, "Create").trigger("click");

      await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
      expect(apiClient.post).toHaveBeenCalledWith(
        "courses",
        expect.objectContaining({
          name: "Programming II",
          number: "COMP-2100",
          semesters: ["Fall"],
          frequency: "Yearly",
          hours: 3,
          department: "Computer Science",
        }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("COMP-2100"));
      expect(wrapper.text().indexOf("COMP-2100")).toBeLessThan(wrapper.text().indexOf("MATH-1100"));
    });

    it("User creates a course with an empty required field", async () => {
      await mountCoursesAs(adminUser, []);

      const dialog = await openAddDialog();

      // Settle after clicking so the form's validation finishes before the next field changes.
      const submitExpecting = async (message) => {
        await buttonIn(dialog, "Create").trigger("click");
        await settle();
        await waitFor(() => expect(pageText()).toMatch(message));
        expect(apiClient.post).not.toHaveBeenCalled();
      };

      await setFields(dialog, { ...completeCourseForm, Name: "   " });
      await submitExpecting(/required/i);

      await setFields(dialog, { Name: "Programming II", "Credit Hours": "" });
      await submitExpecting(/hours must be a whole number/i);

      await setFields(dialog, { "Credit Hours": "3", "Semesters Offered": [] });
      await submitExpecting(/semesters must include at least one/i);

      await setFields(dialog, { "Semesters Offered": ["Fall"], Description: "   " });
      await submitExpecting(/description is required/i);
    });

    it("User creates a course with invalid formatted fields", async () => {
      await mountCoursesAs(adminUser, []);
      apiClient.post.mockRejectedValueOnce(apiError(400, "Number must be in the form XXXX-#### (ex. COMP-1234)"));

      const dialog = await openAddDialog();
      await setFields(dialog, { ...completeCourseForm, Number: "CS210" });
      await buttonIn(dialog, "Create").trigger("click");

      // Either inline validation or the API's 400 message must surface the expected format.
      await waitFor(() => expect(pageText()).toContain("XXXX-####"));
      expect(wrapper.text()).not.toContain("CS210");
    });
  });

  describe("US-3.2 — View courses", () => {
    it("Courses view loads with existing courses", async () => {
      await mountCoursesAs(adminUser, [
        course({ name: "Programming II", number: "COMP-2100", semesters: ["Fall", "Spring"] }),
        course({ name: "Composition", number: "ENGL-1010", department: "English", frequency: "Odd Years", hours: 4 }),
      ]);

      expect(apiClient.get).toHaveBeenCalledWith("courses", {
        params: expect.objectContaining({ sort: "number", page: 1, pageSize: 20 }),
      });
      expect(wrapper.find("h1, h2, h3").text()).toBe("Courses");

      const text = wrapper.text();
      for (const expected of ["Programming II", "COMP-2100", "Fall", "Spring", "Yearly", "3", "Computer Science"]) {
        expect(text).toContain(expected);
      }
      for (const expected of ["Composition", "ENGL-1010", "Odd Years", "4", "English"]) {
        expect(text).toContain(expected);
      }
      expect(text.indexOf("COMP-2100")).toBeLessThan(text.indexOf("ENGL-1010"));
      expect(text).not.toContain("No courses yet");
    });

    it("User has no courses available", async () => {
      await mountCoursesAs(adminUser, []);

      expect(wrapper.text()).toContain("No courses yet. Create your first course.");
    });

    it("Non-admin user views courses", async () => {
      await mountCoursesAs(studentUser, [course()]);

      expect(wrapper.text()).toContain("Programming II");
      expect(wrapper.text()).toContain("COMP-2100");
      expect(wrapper.findAllComponents(VBtn).some((b) => /new course/i.test(b.text()))).toBe(false);
      expect(cardMenus()).toHaveLength(0);
    });
  });

  describe("US-3.3 — Search/filter/paginate courses", () => {
    it("Admin searches for a specific course", async () => {
      const programming = course({ name: "Programming II", number: "COMP-2100" });
      await mountCoursesAs(adminUser, [
        programming,
        course({ name: "Composition", number: "ENGL-1010", department: "English" }),
        course({ name: "Calculus I", number: "MATH-1100" }),
      ]);
      apiClient.get.mockResolvedValue(pageOf([programming]));

      await searchFor("COMP-");

      // Filtering happens on the server; the view shows whatever page the API returns.
      await waitFor(() => expect(lastListParams()).toMatchObject({ q: "COMP-", page: 1 }));
      await waitFor(() => expect(wrapper.text()).not.toContain("ENGL-1010"));
      expect(wrapper.text()).toContain("COMP-2100");
      expect(wrapper.text()).not.toContain("MATH-1100");
    });

    it("Users filter courses", async () => {
      const composition = course({ name: "Composition", number: "ENGL-1010", department: "English" });
      await mountCoursesAs(adminUser, [course(), composition]);
      apiClient.get.mockResolvedValue(pageOf([composition]));

      filterSelect("Department").vm.$emit("update:modelValue", ["English"]);
      await settle();

      await waitFor(() => expect(lastListParams()).toMatchObject({ department: "English", page: 1 }));
      await waitFor(() => expect(wrapper.text()).not.toContain("COMP-2100"));
      expect(wrapper.text()).toContain("ENGL-1010");

      filterSelect("Semester").vm.$emit("update:modelValue", ["Fall", "Spring"]);
      await settle();
      await waitFor(() => expect(lastListParams()).toMatchObject({ department: "English", semester: "Fall,Spring" }));
    });

    it("Search with no matches", async () => {
      await mountCoursesAs(adminUser, [course()]);
      apiClient.get.mockResolvedValue(pageOf([]));

      await searchFor("zzz");

      await waitFor(() => expect(wrapper.text()).toContain("No courses match those search terms."));
      expect(wrapper.text()).not.toContain("No courses yet");
    });

    it("Admin paginates through courses", async () => {
      const courses = Array.from({ length: 25 }, (_, i) =>
        course({ name: `Course ${i + 1}`, number: `COMP-${String(1001 + i)}` }),
      );
      await mountCoursesAs(adminUser, courses.slice(0, 20), { total: 25 });

      expect(lastListParams()).toMatchObject({ page: 1, pageSize: 20 });
      expect(wrapper.text()).toContain("COMP-1001");
      expect(wrapper.text()).toContain("COMP-1020");
      expect(wrapper.text()).not.toContain("COMP-1021");

      apiClient.get.mockResolvedValue(pageOf(courses.slice(20), { total: 25, page: 2 }));
      await wrapper.find('[aria-label="Next page"]').trigger("click");
      await settle();

      await waitFor(() => expect(lastListParams()).toMatchObject({ page: 2, pageSize: 20 }));
      await waitFor(() => expect(wrapper.text()).toContain("COMP-1021"));
      expect(wrapper.text()).toContain("COMP-1025");
      expect(wrapper.text()).not.toContain("COMP-1001");
    });
  });

  describe("US-3.4 — Manage course cards", () => {
    it("Course cards show edit and delete actions for admins", async () => {
      await mountCoursesAs(adminUser, [course(), course({ name: "Calculus I", number: "MATH-1100" })]);

      expect(cardMenus()).toHaveLength(2);

      await openCardMenu(0);
      await waitFor(() => menuItem("Edit"));
      expect(menuItem("Delete")).toBeDefined();
    });

    it("Course cards do not show edit/delete actions for non-admins", async () => {
      await mountCoursesAs(studentUser, [course(), course({ name: "Calculus I", number: "MATH-1100" })]);

      expect(cardMenus()).toHaveLength(0);
      expect(wrapper.findAllComponents(VListItem).some((item) => /^(Edit|Delete)$/.test(item.props("title")))).toBe(
        false,
      );
    });
  });

  describe("US-3.5 — Edit and delete courses", () => {
    it("Admin edits a course", async () => {
      const programming = course({ name: "Programming I", number: "COMP-1100" });
      await mountCoursesAs(adminUser, [programming]);
      const updated = { ...programming, semesters: ["Winter"] };
      apiClient.put.mockResolvedValueOnce({ data: updated });
      apiClient.get.mockResolvedValue(pageOf([updated]));

      await chooseCardAction(0, "Edit");
      const dialog = openDialog();
      expect(fieldIn(dialog, "Name").find("input").element.value).toBe("Programming I");
      expect(fieldIn(dialog, "Number").find("input").element.value).toBe("COMP-1100");

      await setFields(dialog, { "Semesters Offered": ["Winter"] });
      await buttonIn(dialog, "Save").trigger("click");

      await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(1));
      expect(apiClient.put).toHaveBeenCalledWith(
        `courses/${programming.id}`,
        expect.objectContaining({ name: "Programming I", number: "COMP-1100", semesters: ["Winter"] }),
      );
      await waitFor(() => expect(wrapper.text()).toContain("Winter"));
      expect(wrapper.text()).not.toContain("Fall");
    });

    it("Admin deletes a course", async () => {
      const programming = course();
      await mountCoursesAs(adminUser, [programming]);
      apiClient.delete.mockResolvedValueOnce({ data: { message: "course deleted successfully." } });
      apiClient.get.mockResolvedValue(pageOf([]));

      await chooseCardAction(0, "Delete");
      const dialog = openDialog();
      const confirm = dialog.findAllComponents(VBtn).find((b) => /^delete/i.test(b.text().trim()));
      expect(confirm).toBeDefined();
      await confirm.trigger("click");

      await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(`courses/${programming.id}`));
      await waitFor(() => expect(wrapper.text()).not.toContain("COMP-2100"));
      expect(wrapper.text()).toContain("No courses yet. Create your first course.");
    });
  });
});
