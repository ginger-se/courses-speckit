<script setup>
import { computed, onMounted, ref, reactive, watch } from "vue";
import courseServices from "../services/courseServices.js";
import CourseForm from "../components/forms/CourseForm.vue";
import Utils from "../config/utils.js";
import { SEMESTERS, DEPARTMENTS, FREQUENCIES } from "../utils/constants.js";

const SORTABLE = [
  {
    label: "Number",
    value: "number",
  },
  {
    label: "Name",
    value: "name",
  },
  {
    label: "Hours",
    value: "hours",
  },
  {
    label: "Department",
    value: "department",
  },
];

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

const filters = reactive({ q: "", department: [], semester: [], frequency: [], sort: "number" });
const page = ref(1);
const total = ref(0);
const pageCount = ref(0);

const hasFilters = computed(
  () => !!filters.q.trim() || filters.department.length || filters.semester.length || filters.frequency.length,
);

const retrieveCourses = async () => {
  loading.value = true;
  listError.value = "";

  try {
    const { data } = await courseServices.getCourses({
      q: filters.q.trim() || undefined,
      department: filters.department.join(",") || undefined,
      semester: filters.semester.join(",") || undefined,
      frequency: filters.frequency.join(",") || undefined,
      sort: filters.sort,
      page: page.value,
      pageSize: ITEMS_PER_PAGE,
    });
    courses.value = data.items;
    total.value = data.total;
    pageCount.value = data.pageCount;

    if (page.value > 1 && page.value > data.pageCount) {
      page.value = data.pageCount || 1;
    }
  } catch (error) {
    listError.value = error.response?.data?.message || "Failed to fetch courses.";
  } finally {
    loading.value = false;
  }
};

// debounce search field so we don't overload the server
let searchTimer;
watch(
  () => filters.q,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page.value === 1 ? retrieveCourses() : (page.value = 1);
    }, 300);
  },
);

watch(
  () => [filters.department, filters.semester, filters.frequency, filters.sort],
  () => {
    page.value === 1 ? retrieveCourses() : (page.value = 1);
  },
  { deep: true },
);

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

watch(page, retrieveCourses);

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
      <!-- fixed-height slot so showing/hiding the bar doesn't shift the list -->
      <div class="mb-4" style="height: 4px">
        <v-progress-linear v-if="loading" indeterminate />
      </div>

      <v-alert v-if="listError" type="error" density="compact" class="mb-4">
        {{ listError }}
      </v-alert>

      <p v-if="!hasFilters && total === 0" class="text-body-1">No courses yet. Create your first course.</p>
      <p v-else-if="hasFilters && total === 0" class="text-body-1">No courses match those search terms.</p>
      <div class="d-flex flex-column ga-4">
        <v-row>
          <v-text-field v-model="filters.q" prepend-inner-icon="mdi-magnify" placeholder="Search courses..." />
          <v-select v-model="filters.department" :items="DEPARTMENTS" label="Department" multiple chips clearable />
          <v-select v-model="filters.semester" :items="SEMESTERS" label="Semester" multiple chips clearable />
          <v-select v-model="filters.frequency" :items="FREQUENCIES" label="Frequency" multiple clearable />
          <v-select v-model="filters.sort" :items="SORTABLE" item-title="label" item-value="value" label="Sort by" />
        </v-row>
        <v-card v-for="course in courses">
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

    <v-pagination v-if="pageCount > 1" v-model="page" :length="pageCount" :total-visible="7" class="mt-4" />

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
