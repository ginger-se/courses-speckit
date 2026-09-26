<script setup>
import { ref } from "vue";

const props = defineProps({
  modelValue: { type: Object, required: true },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const formRef = ref(null);

const DEPARTMENTS = ["Computer Science", "Engineering", "English", "Business", "Art"];
const FREQUENCIES = ["Yearly", "Even Years", "Odd Years"];
const SEMESTERS = ["Fall", "Winter", "Spring", "Summer"];

const updateField = (field, value) => {
  emit("update:modelValue", { ...props.modelValue, [field]: value });
};

const nameRules = [
  (value) => !!value?.trim() || "Required",
  (value) => (value?.trim().length ?? 0) <= 255 || "Name must be 255 characters or fewer.",
];
const numberRules = [
  (v) => !!v || "Course number is required",
  (v) => /^[A-Z]{4}-\d{4}$/.test(v) || "Number must be in the format XXXX-#### (ex. COMP-1234)",
];
const departmentRules = [
  (value) => !!value || "Required",
  (value) => DEPARTMENTS.includes(value) || `Course department must be one of ${DEPARTMENTS.join(", ")}.`,
];
const semestersRules = [
  (value) => !!value || "Required",
  (value) =>
    value.every((semester) => SEMESTERS.includes(semester)) ||
    `Semesters offered must be one or more of ${SEMESTERS.join(", ")}.`,
];
const descriptionRules = [(v) => !!v || "Description is required"];
const frequencyRules = [(v) => !!v || "Frequency is required"];
const hoursRules = [(v) => !v || Number.isInteger(Number(v)) || "Value must be an integer"];

const validate = () => formRef.value.validate();

defineExpose({ validate });
</script>

<template>
  <v-form ref="formRef" @submit.prevent="emit('submit')">
    <v-row>
      <v-col cols="6">
        <v-text-field
          :model-value="modelValue.name"
          label="Name"
          density="comfortable"
          :rules="nameRules"
          @update:model-value="updateField('name', $event)"
        />
      </v-col>
      <v-col cols="6">
        <v-text-field
          :model-value="modelValue.number"
          label="Number"
          density="comfortable"
          :rules="numberRules"
          @update:model-value="updateField('number', $event)"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="6">
        <v-text-field
          :model-value="modelValue.hours"
          type="number"
          label="Credit Hours"
          density="comfortable"
          :rules="hoursRules"
          @update:model-value="updateField('hours', $event)"
        />
      </v-col>
      <v-col cols="6">
        <v-select
          :model-value="modelValue.department"
          label="Department"
          :items="DEPARTMENTS"
          density="comfortable"
          :rules="departmentRules"
          @update:model-value="updateField('department', $event)"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="6">
        <v-select
          :model-value="modelValue.semesters"
          label="Semesters Offered"
          :items="SEMESTERS"
          density="comfortable"
          :rules="semestersRules"
          chips
          multiple
          @update:model-value="updateField('semesters', $event)"
        />
      </v-col>
      <v-col cols="6">
        <v-select
          :model-value="modelValue.frequency"
          label="Frequency"
          :items="FREQUENCIES"
          density="comfortable"
          :rules="frequencyRules"
          @update:model-value="updateField('frequency', $event)"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-textarea
          :model-value="modelValue.description"
          label="Description"
          density="comfortable"
          :rules="descriptionRules"
          @update:model-value="updateField('description', $event)"
        />
      </v-col>
    </v-row>
  </v-form>
</template>
