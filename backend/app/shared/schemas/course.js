import { z } from "zod";
import { DEPARTMENTS, FREQUENCIES, SEMESTERS } from "../constants.js";

const NAME = "Name is required and must be 255 characters or fewer.";
const NUMBER = "Number must be in the form XXXX-#### (ex. COMP-1234).";
const DESCRIPTION = "Description is required.";
const SEMESTER = `Semesters must include at least one of ${SEMESTERS.join(", ")}.`;
const FREQUENCY = `Frequency must be one of ${FREQUENCIES.join(", ")}.`;
const HOURS = "Hours must be a whole number of at least 1.";
const DEPARTMENT = `Department must be one of ${DEPARTMENTS.join(", ")}.`;

export const courseSchema = z.object({
  name: z.string(NAME).trim().min(1, NAME).max(255, NAME),
  number: z
    .string(NUMBER)
    .trim()
    .regex(/^[A-Z]{4}-\d{4}$/, NUMBER),
  description: z.string(DESCRIPTION).trim().min(1, DESCRIPTION),
  semesters: z.array(z.enum(SEMESTERS, SEMESTER), SEMESTER).min(1, SEMESTER),
  frequency: z.enum(FREQUENCIES, FREQUENCY),
  hours: z.coerce.number(HOURS).int(HOURS).min(1, HOURS),
  department: z.enum(DEPARTMENTS, DEPARTMENT),
});
