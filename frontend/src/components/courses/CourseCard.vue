<script setup>
const props = defineProps({
  course: { type: Object, required: true },
  canManage: { type: Boolean, default: false },
});

const emit = defineEmits(["edit", "delete"]);
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-title>{{ course.name }}</v-card-title>

      <v-card-subtitle> {{ course.department }}: {{ course.number }} </v-card-subtitle>

      <template v-slot:append v-if="canManage">
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
            <v-list-item title="Edit" prepend-icon="mdi-pencil" density="compact" @click="emit('edit', course)" />
            <v-list-item
              title="Delete"
              prepend-icon="mdi-trash-can"
              density="compact"
              @click="emit('delete', course)"
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

        <v-chip color="green" v-for="semester in course.semesters" :key="semester">{{ semester }}</v-chip>
      </div>
    </div>
  </v-card>
</template>
