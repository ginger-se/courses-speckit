<script setup>
import { ref } from "vue";
import { DEPARTMENTS, SEMESTERS, FREQUENCIES } from "@shared/constants.js";
import { zodRule } from "../../utils/zodRule";
import { courseSchema } from "@shared/schemas/course";

const props = defineProps({
  modelValue: { type: Object, required: true },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const formRef = ref(null);

const updateField = (field, value) => {
  emit("update:modelValue", { ...props.modelValue, [field]: value });
};

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
          :rules="[zodRule(courseSchema.shape.name)]"
          @update:model-value="updateField('name', $event)"
        />
      </v-col>
      <v-col cols="6">
        <v-text-field
          :model-value="modelValue.number"
          label="Number"
          density="comfortable"
          :rules="[zodRule(courseSchema.shape.number)]"
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
          :rules="[zodRule(courseSchema.shape.hours)]"
          @update:model-value="updateField('hours', $event)"
        />
      </v-col>
      <v-col cols="6">
        <v-select
          :model-value="modelValue.department"
          label="Department"
          :items="DEPARTMENTS"
          density="comfortable"
          :rules="[zodRule(courseSchema.shape.department)]"
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
          :rules="[zodRule(courseSchema.shape.semesters)]"
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
          :rules="[zodRule(courseSchema.shape.frequency)]"
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
          :rules="[zodRule(courseSchema.shape.description)]"
          @update:model-value="updateField('description', $event)"
        />
      </v-col>
    </v-row>
  </v-form>
</template>
