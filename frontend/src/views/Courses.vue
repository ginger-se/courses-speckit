<script setup>
import { computed, onMounted, ref } from "vue";
import courseServices from "../services/courseServices.js";
import CourseForm from "../components/forms/CourseForm.vue";
import Utils from "../config/utils.js";

const emptyForm = () => ({
  name: "",
  number: "",
  description: "",
  semesters: null,
  frequency: "",
  hours: 3,
  department: "",
});

const ITEMS_PER_PAGE = 20;

const user = ref(Utils.getStore("user"));
const courses = ref([]);
const query = ref("");
const page = ref(1);
const loading = ref(false);
const listError = ref("");
const formDialogOpen = ref(false);
const isAddMode = ref(true);
const form = ref(emptyForm());
const formRef = ref(null);
const formError = ref("");
const saving = ref(false);
const editingId = ref(null);
const deleteDialogOpen = ref(false);
const courseToDelete = ref(null);
const deleting = ref(false);

const formTitle = computed(() => (isAddMode.value ? "Add Course" : "Edit Course"));
const saveLabel = computed(() => (isAddMode.value ? "Create" : "Save"));
const isAdmin = computed(() => user.value?.role === "admin");

const retrieveCourses = async () => {
  loading.value = true;
  listError.value = "";

  try {
    const response = await courseServices.getCourses();
    courses.value = response.data;
  } catch (error) {
    listError.value = error.response?.data?.message || "Failed to fetch courses.";
  } finally {
    loading.value = false;
  }
};

const filteredCourses = computed(() => {
  if (!query.value) return courses.value;

  const search = query.value.trim().toLowerCase().split(" ");
  return courses.value.filter((course) =>
    search.every(
      (word) =>
        course.name.toLowerCase().includes(word) ||
        course.number.toLowerCase().includes(word) ||
        course.department.toLowerCase().includes(word) ||
        course.description.toLowerCase().includes(word) ||
        course.semesters.some((semester) => semester.toLowerCase().includes(word)),
    ),
  );
});

const pageCount = computed(() => Math.ceil(filteredCourses.value.length / ITEMS_PER_PAGE));
const paginatedCourses = computed(() => {
  const start = (page.value - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return filteredCourses.value.slice(start, end);
});

const openAddDialog = () => {
  isAddMode.value = true;
  editingId.value = null;
  form.value = emptyForm();
  formError.value = "";
  formDialogOpen.value = true;
};

const openEditDialog = (course) => {
  isAddMode.value = false;
  editingId.value = course.id;
  form.value = {
    name: course.name ?? "",
    number: course.number ?? "",
    description: course.description ?? "",
    semesters: course.semesters ?? "",
    frequency: course.frequency ?? "",
    hours: course.hours ?? "",
    department: course.department ?? "",
  };
  formError.value = "";
  formDialogOpen.value = true;
};

const closeFormDialog = () => {
  formDialogOpen.value = false;
  formError.value = "";
  editingId.value = null;
};

const saveCourse = async () => {
  formError.value = "";
  const result = await formRef.value?.validate();

  if (!result?.valid) {
    return;
  }

  saving.value = true;

  const payload = {
    name: form.value.name.trim(),
    number: form.value.number.trim(),
    hours: Number(form.value.hours),
    department: form.value.department.trim(),
    semesters: Array.isArray(form.value.semesters) ? form.value.semesters : [],
    frequency: form.value.frequency.trim(),
    description: form.value.description.trim(),
  };

  try {
    if (isAddMode.value) {
      await courseServices.createCourse(payload);
    } else {
      await courseServices.updateCourse(editingId.value, payload);
    }

    closeFormDialog();
    await retrieveCourses();
  } catch (error) {
    formError.value =
      error.response?.data?.message || (isAddMode.value ? "Failed to create course." : "Failed to update course.");
  } finally {
    saving.value = false;
  }
};

const openDeleteDialog = (course) => {
  courseToDelete.value = course;
  deleteDialogOpen.value = true;
};

const closeDeleteDialog = () => {
  deleteDialogOpen.value = false;
  courseToDelete.value = null;
};

const confirmDeleteCourse = async () => {
  if (!courseToDelete.value?.id) {
    return;
  }

  deleting.value = true;
  listError.value = "";

  try {
    await courseServices.removeCourse(courseToDelete.value.id);
    closeDeleteDialog();
    await retrieveCourses();
  } catch (error) {
    listError.value = error.response?.data?.message || "Failed to delete course.";
  } finally {
    deleting.value = false;
  }
};

onMounted(retrieveCourses);
</script>

<template>
  <v-container class="py-8">
    <v-toolbar color="transparent" flat>
      <template #title>
        <h2 class="text-headline-large font-weight-bold">Courses</h2>
      </template>
      <template #append v-if="isAdmin">
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openAddDialog"> + New Course </v-btn>
      </template>
    </v-toolbar>

    <v-card-text>
      <v-progress-linear v-if="loading" indeterminate class="mb-4" />

      <v-alert v-if="listError" type="error" density="compact" class="mb-4">
        {{ listError }}
      </v-alert>

      <p v-if="!loading && courses.length === 0" class="text-body-1">No courses yet. Create your first course.</p>
      <p v-else-if="filteredCourses.length === 0" class="text-body-1">No courses match those search terms.</p>
      <div class="d-flex flex-column ga-4">
        <v-row>
          <v-text-field v-model="query" prepend-inner-icon="mdi-magnify" placeholder="Search courses..." />
        </v-row>
        <v-card v-for="course in paginatedCourses">
          <v-card-item>
            <v-card-title>{{ course.name }}</v-card-title>

            <v-card-subtitle> {{ course.department }}: {{ course.number }} </v-card-subtitle>

            <template v-slot:append v-if="isAdmin">
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon="mdi-dots-vertical"
                    variant="text"
                    v-bind="props"
                    density="compact"
                    aria-label="Course actions"
                  ></v-btn>
                </template>

                <v-list>
                  <v-list-item
                    title="Edit"
                    prepend-icon="mdi-pencil"
                    density="compact"
                    @click="openEditDialog(course)"
                  />
                  <v-list-item
                    title="Delete"
                    prepend-icon="mdi-trash-can"
                    density="compact"
                    @click="openDeleteDialog(course)"
                  />
                </v-list>
              </v-menu>
            </template>
          </v-card-item>

          <v-card-text>
            <div>{{ course.description }}</div>
          </v-card-text>

          <v-divider class="mx-4 mb-1"></v-divider>

          <div class="px-4 my-2">
            <div class="d-flex gc-2">
              <v-chip color="primary">{{ course.hours }} hours</v-chip>

              <v-chip color="blue">{{ course.frequency }}</v-chip>

              <v-chip color="green" v-for="semester in course.semesters">{{ semester }}</v-chip>
            </div>
          </div>
        </v-card>
      </div>
    </v-card-text>

    <v-row justify="center" class="mt-4" v-if="pageCount > 1">
      <v-pagination v-model="page" :length="pageCount"></v-pagination>
    </v-row>

    <v-dialog v-model="formDialogOpen" max-width="800">
      <v-card rounded="lg">
        <v-card-title>{{ formTitle }}</v-card-title>
        <v-card-text>
          <CourseForm ref="formRef" v-model="form" @submit="saveCourse" />
          <v-alert v-if="formError" type="error" density="compact" class="mt-2">
            {{ formError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeFormDialog">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="saveCourse">
            {{ saveLabel }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialogOpen" max-width="420">
      <v-card rounded="lg">
        <v-card-title>Delete course</v-card-title>
        <v-card-text>Delete this course?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="deleting" @click="confirmDeleteCourse">
            Delete Course
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
