<script setup>
import { ref } from "vue";
import sectionServices from "../../services/sectionServices";
import { useRequest } from "../../composables/useRequest.js";
import { useConfirm } from "../../composables/useConfirm.js";



const sectionList = defineModel({ type: Object, required: true });
const props = defineProps({
  courseId: { type: Number, default: null },
  faculty: {tpye: Object, default: null},
  semesters: {tpye: Object, default: null}
});
const page = ref(1)
const required = (label) => (v) =>
  (Array.isArray(v) ? v.length > 0 : !!String(v ?? "").trim()) || `${label} is required.`;

const oneOf = (options, label) => (v) =>
  [v].flat().every((x) => options.includes(x)) || `${label} must be one of ${options.join(", ")}.`;

const rules = {
  name: [required("Name"), (v) => v?.trim().length <= 255 || "Name must be 255 characters or fewer."],
  number: [
    required("Course number"),
    (v) => /^[A-Z]{4}-\d{4}$/.test(v) || "Number must be in the format XXXX-#### (ex. COMP-1234).",
  ],
};

function addSection(){
    let newSection = {
        sectionNumber: null,
        startTime: null,
        endTime: null,
        semesterId: null,
        facultyFacultyId: null,
        courseId: props.courseId,
        daysOfWeek: null,

    }
    console.log(newSection);
    sectionList.value = [newSection, ...sectionList.value];
}

const {
  data: newSection,
  loadingSection,
  sectionError,
  run: createSection
} = useRequest(sectionServices.createSection, {initial: [], fallback: "Failed to create section."});
const {
  data: updatedSection,
  loadingSectionUpdate,
  sectionUpdateError,
  run: updateSection
} = useRequest(sectionServices.updateSection, {initial: [], fallback: "Failed to update section."});

function save(section){
    if(section.sectionNumber == null || section.startTime == null || section.endTime == null || section.semesterId == null || section.facultyFacultyId == null || section.daysOfWeek == null )
        return;
    if(section.id == null){
        console.log(props.courseId);
        createSection(section);
        const index = sectionList.value.findIndex(item => item.sectionNumber === section.sectionNumber)
  
        if (index !== -1) {
            // Replace the entire object at that index
            sectionList.value[index] = newSection;
        }
    }else {
        updateSection(section.id, section);
    }
}

const confirmDelete = useConfirm();

const deleteSection = async (section, index) => {
  if(section.id == undefined){
        sectionList.value.splice(index,1);
        return;
  }
  const deleted = await confirmDelete({
    title: "Delete section",
    message: `Delete "${section.sectionNumber}"? This action is permanent.`,
    confirmText: "Delete Section",
    confirmColor: "error",
    onConfirm: () => sectionServices.removeSection(section.id),
  });

  if (deleted) {
    sectionList.value = sectionList.value.filter(item => item.id !== section.id);
  }
};


</script>

<template>
  <div class="d-flex justify-space-between">

      <v-card-title>Course Sections</v-card-title>
      <v-btn @click="addSection()" color="primary" variant="elevated" class="oc-cta">
                Add Section
      </v-btn>
  </div>
  <v-defaults-provider :defaults="{ global: { density: 'comfortable' } }">
    <v-data-iterator :items="sectionList" :page="page" :items-per-page="3">
        <template v-slot:default="{ items }">
            <template
            v-for="(section, index) in items"
            :key="index"
            :section="section"
            >
            <v-row @focusout="save(section.raw)">
                <v-col cols="2">
                    <v-text-field
                        :model-value="section.raw.sectionNumber"
                        label="Number"
                        hint="e.g. COMP-1234"
                        :rules="rules.sectionNumber"
                        @update:model-value="section.raw.sectionNumber = $event.toUpperCase()"
                    />
                
            </v-col>
            <v-col cols="2">
                <v-text-field v-model="section.raw.startTime" type="" label="Start Time" :rules="rules.startTime"  hint="e.g. 12:30pm" />
                
            </v-col>
            <v-col cols="2">

                <v-text-field v-model="section.raw.endTime" type="" label="End Time" :rules="rules.endTime" hint="e.g. 12:30pm"/>
            </v-col>
            <v-col cols="2">

                <v-select
                v-model="section.raw.semesterId"
                label="Semester"
                :items="props.semesters"
                item-title="firstName"
                item-value="facultyId"
                :rules="rules.semesters"
                chips   
                />
            </v-col>
            <v-col cols="2">
                
                <v-select
                v-model="section.raw.facultyFacultyId"
                label="Professor"
                :items="props.faculty"
                :item-title="item => `${item.firstName} ${item.lastName}`"
                item-value="facultyId"
                :rules="rules.faculty"
                chips
                />
            </v-col>
            <v-col cols="1">

                <v-text-field v-model="section.raw.daysOfWeek" label="Days of week" :rules="rules.daysOfWeek" hint="e.g. M,W,F"/>
            </v-col>
            <v-col cols="1">

            <v-list-item
                        title=""
                        class="pt-4"
                        prepend-icon="mdi-trash-can"
                        density=""
                        @click="deleteSection(section.raw, index)"
                        />       
                 </v-col>
            
        </v-row>
            </template>
        </template>
        <template v-slot:footer="{ pageCount }">
            <v-pagination v-model="page" :length="pageCount"></v-pagination>
        </template>
    </v-data-iterator>
        <!-- <v-row
            v-for="section in sectionList"
            :key="section.id"
            :section="section"
        >
            <v-col cols="2">
                <v-text-field
                :model-value="section.sectionNumber"
                label="Number"
                hint="e.g. COMP-1234"
                :rules="rules.sectionNumber"
                @update:model-value="section.sectionNumber = $event.toUpperCase()"
                />
                
            </v-col>
            <v-col cols="2">
                <v-text-field v-model="section.startTime" type="" label="Start Time" :rules="rules.startTime"  hint="e.g. 12:30pm" />

            </v-col>
            <v-col cols="2">

                <v-text-field v-model="section.endTime" type="" label="End Time" :rules="rules.endTime" hint="e.g. 12:30pm"/>
            </v-col>
            <v-col cols="2">

                <v-select
                v-model="section.semesterId"
                label="Semester"
                :items="SEMESTERS"
                :rules="rules.semesters"
                chips
                multiple
                />
            </v-col>
            <v-col cols="2">

                <v-select
                v-model="section.facultyId"
                label="Professor"
                :items="Professors"
                :rules="rules.faculty"
                chips
                multiple
                />
            </v-col>
            <v-col cols="2">

                <v-text-field v-model="section.daysOfWeek" label="Days of week" :rules="rules.daysOfWeek" hint="e.g. M,W,F"/>
            </v-col>
        </v-row> -->
  </v-defaults-provider>
</template>
