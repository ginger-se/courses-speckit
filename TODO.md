# Refactor TODO

Findings from the codebase review. The goal is to fix the confirmed bugs, then build shared patterns before other features start. Work top to bottom: later sections depend on earlier ones.

## 1. Confirmed bugs (fix first)

### Status codes

- [x] Adopt one convention everywhere: **401** = not logged in, **403** = wrong role, **404** = not found or not yours.
- [x] Make wrong-role requests return `403` instead of `401`. Today a student who calls an admin route gets logged out, because the axios interceptor clears the user on every 401 ([services.js:29](frontend/src/services/services.js#L29)).
- [x] Have the interceptor react to the status code only, not to messages matching `/Unauthorized/`.

### Course validation

These are in [course.controller.js](backend/app/controllers/course.controller.js):

- [x] `semesters: "Fall"` (a string instead of a list) returns a 500. Return a 400.
- [x] `semesters: []` is accepted. Require at least one semester.
- [x] `hours: 0` returns the message `"Required"`. Return a real validation message.
- [x] Required-field errors say only `"Required"`. Name the missing field.
- [ ] The client-side hours rule allows an empty value ([CourseForm.vue:40](frontend/src/components/forms/CourseForm.vue#L40)).

### Frontend


- [x] [Courses.vue:39](frontend/src/views/Courses.vue#L39) reads the user once and never updates the role.
- [x] Add `:key` to the two `v-for` loops ([Courses.vue:247](frontend/src/views/Courses.vue#L247), [Courses.vue:295](frontend/src/views/Courses.vue#L295)).
- [x] Show delete errors inside the delete dialog. They currently render behind it.

## 2. Backend

### Errors

- [x] Upgrade to Express 5, which passes errors from async handlers to the error middleware on its own.
- [x] Add an `HttpError` type with helpers such as `notFound("Course")` and `badRequest(msg)`.
- [x] Add one error middleware:
  - `HttpError` becomes `{ message }` with its status code;
  - Sequelize `UniqueConstraintError` becomes a 400;
  - anything else is logged and becomes a 500.
- [x] Delete the per-handler `try/catch/logger/500` blocks.
- [x] Remove the hand-written "already taken" lookups and rely on unique indexes instead.

### Validation

- [x] Create a `shared/` package with Zod schemas and enum lists that both frontend and backend import.

-
- [x] Add a `validate({ body, query, params })` middleware that returns `400 { message }` built from the first problem found.
- [x] Validate `:id` once with `router.param("id", …)`.
- [ ] Delete `helpers/fields.js`, and replace `helpers/constants.js` with the shared enums.

### Lists (pagination, filtering, sorting, search)

- [ ] Build a declarative `listHandler(model, { search, sort, filters, scope, include })`. It should handle:
  - `page` and `pageSize` limits;
  - list params sent as either `a,b` or `x=a&x=b`;
  - escaping `LIKE` wildcards, and word-by-word AND search;
  - a stable `id` tie-break when sorting;
  - the `{ items, total, page, pageSize, pageCount }` response shape.
- [ ] Add filter helpers: `oneOf(values)` and `csvContains(column, values)`.
- [ ] Use `distinct: true` whenever `include` is set, so totals aren't inflated.
- [ ] Support `scope(req)` for user-scoped lists (Feature 7).
- [ ] Unit-test `listHandler` once.

### Auth

- [ ] Merge `authenticate` and `authenticateAdmin` into `authenticate` plus `requireRole(...roles)` ([authorization.js](backend/app/authorization/authorization.js)).
- [ ] Add an `ownOrAdmin` check and use it on `/users/:id`.
- [ ] Remove the hardcoded fallback for `AUTH_SECRET` in production ([auth.config.js](backend/app/config/auth.config.js)).

### CRUD

- [ ] Add `crudController(model, { label })` providing `findOne`, `create`, `update` and `remove`, each of which can be overridden.
- [ ] Refactor courses onto the new pieces, keeping the existing tests passing.

## 3. Frontend

### Services

- [ ] Add `createResource("courses")`, which returns `{ list, get, create, update, remove }`.
- [ ] Add an axios `paramsSerializer` for array params, so views stop calling `.join(",")`.

### Composables

- [ ] `useList(fetchFn, { filters, debounce })` handles:
  - loading and error state;
  - the debounce;
  - going back to page 1 when a filter changes;
  - keeping the page in range;
  - ignoring stale responses.
- [ ] Optionally, sync list filters to the URL query string.
- [ ] `useAsync(fn)` returns `{ run, loading, error }`. Use it to replace the six copied loading/error blocks in Login, Register, MenuBar and Courses.

### Auth state

- [ ] Add a reactive `useAuth()` singleton exposing `user`, `isAdmin` and `hasRole`. It replaces the localStorage reads and the `window` CustomEvents.
- [ ] Add role guards to the router via `meta: { roles: [...] }` ([router.js](frontend/src/router.js)). Features 4 and 7 need them.

### Validation

- [ ] Add a `zodRule(schemaField)` helper for Vuetify rules.
- [ ] Replace the rule arrays in CourseForm, Register and MenuBar with it.

### Components and UI

- [ ] Build the shared components:
  - `PageHeader` (title + CTA);
  - `ListStatus` (loading, error and empty states);
  - `FormDialog`;
  - `ConfirmDialog`.
- [ ] Rebuild Courses.vue with them.
- [ ] Fix these UI inconsistencies:
  - raw `blue`/`green` chip colors → theme colors;
  - the inline `style="height: 4px"`;
  - `v-card-text` used as a page wrapper;
  - filter inputs in a `v-row` without `v-col` (breaks on phones);
  - the primary-colored Delete button → an error color;
  - the delete dialog should name the course.
- [ ] Remove the `density` props on Login and Register that duplicate the Vuetify defaults.

## 4. Tests

- [ ] Move `settle`, `waitFor`, `apiError`, `pageOf` and a mount-as-this-user helper from [Courses.test.js](frontend/tests/Courses.test.js) into `frontend/tests/testUtils.js`.
- [ ] Add backend helpers `as(token)` and `createAdmin()`, and remove the duplicated `bearer()` definitions.

## 5. Rules and docs

- [ ] Rewrite the stale Todo-app rules so they document the new patterns, with Courses as the example to copy:
  - `api-conventions.mdc`
  - `security.mdc`
  - `frontend-services.mdc`
  - `ui-style-system.mdc`
  - `auth-patterns.mdc`
  - `project-structure.mdc`
- [ ] Fill in `features/reference/api.md` and `features/reference/data-model.md` for users and courses.

## 6. Cleanup

- [ ] Delete the leftover Todo code in [validation.js](frontend/src/config/validation.js): due dates and `isTodoOverdue`.
- [ ] Move the CORS origin and the API prefix into environment variables ([server.js](backend/server.js)).
- [ ] Either verify the JWT or replace it with a random session token (the session table is what actually authenticates).
