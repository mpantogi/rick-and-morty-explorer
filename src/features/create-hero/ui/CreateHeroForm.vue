<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useId, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import {
  GENDERS,
  genderLabel,
  HERO_NAME_MAX,
  heroInputSchema,
  useHeroesStore,
} from '@/entities/character'
import { paths } from '@/shared/config'
import { showStorageLimit, toTypedSchema } from '@/shared/lib'
import { BaseButton, BaseField, BaseInput } from '@/shared/ui'

import ImagePreview from './ImagePreview.vue'

// Schema keys follow the field order on screen, so the first one with an error gets focus.
const FIELDS = heroInputSchema.keyof().options
const GENDER_OPTIONS = GENDERS.map((value) => ({ value, label: genderLabel(value) }))
// Bound rather than static: vue-tsc 3.3 loses the slot scope after a static value holding "//".
const IMAGE_HINT = 'A direct link to an image, starting with https:// and a domain name.'
const IMAGE_PLACEHOLDER = 'https://…'

type HeroField = (typeof FIELDS)[number]

const heroes = useHeroesStore()
const router = useRouter()
const form = useTemplateRef<HTMLFormElement>('form')
const genderErrorId = `${useId()}-gender-error`

const { defineField, errors, handleSubmit, submitCount } = useForm({
  validationSchema: toTypedSchema(heroInputSchema),
  initialValues: { name: '', image: '' },
})

// Errors first show on submit, then follow every edit. An error shown on blur would push Create
// hero down while it is pressed, so the release would miss it and the click would be lost.
const validateAfterSubmit = () => ({
  validateOnBlur: false,
  validateOnChange: false,
  validateOnModelUpdate: submitCount.value > 0,
})
const [name, nameEvents] = defineField('name', validateAfterSubmit)
const [gender, genderEvents] = defineField('gender', validateAfterSubmit)
const [image, imageEvents] = defineField('image', validateAfterSubmit)

function focusFirstInvalid({ errors: invalid }: { errors: Partial<Record<HeroField, string>> }) {
  const field = FIELDS.find((key) => invalid[key])
  if (field === undefined) return
  const control =
    form.value?.querySelector<HTMLInputElement>(`[name="${field}"]:checked`) ??
    form.value?.querySelector<HTMLInputElement>(`[name="${field}"]`)
  control?.focus()
}

const onSubmit = handleSubmit(async (values) => {
  const hero = heroes.add(values)
  if (!hero) {
    showStorageLimit()
    return
  }
  toast.success('Hero created', {
    description: `${hero.name} is now first in the character list.`,
  })
  await router.push(paths.home)
}, focusFirstInvalid)
</script>

<template>
  <form
    ref="form"
    novalidate
    class="hero-form flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem]"
    @submit="onSubmit"
  >
    <div class="hero-form__fields flex flex-col gap-6">
      <BaseField
        v-slot="{ id, describedBy, invalid, errorId }"
        label="Name"
        hint="2 to 60 characters."
        :error="errors.name"
        class="hero-form__field"
      >
        <BaseInput
          :id
          v-model="name"
          v-bind="nameEvents"
          name="name"
          type="text"
          :maxlength="HERO_NAME_MAX"
          autocomplete="off"
          spellcheck="false"
          required
          :aria-describedby="describedBy"
          :aria-invalid="invalid"
          :aria-errormessage="errorId"
        />
      </BaseField>

      <fieldset class="hero-form__gender">
        <legend class="hero-form__legend mb-1.5 text-sm font-semibold">Gender</legend>
        <div class="hero-form__options flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-6">
          <label
            v-for="option in GENDER_OPTIONS"
            :key="option.value"
            :for="`hero-gender-${option.value}`"
            class="hero-form__option inline-flex min-h-11 items-center gap-2 self-start"
          >
            <input
              :id="`hero-gender-${option.value}`"
              v-model="gender"
              v-bind="genderEvents"
              type="radio"
              name="gender"
              :value="option.value"
              required
              :aria-invalid="Boolean(errors.gender)"
              :aria-describedby="errors.gender ? genderErrorId : undefined"
              :aria-errormessage="errors.gender ? genderErrorId : undefined"
              class="hero-form__radio size-5 accent-accent"
            />
            {{ option.label }}
          </label>
        </div>
        <p v-if="errors.gender" :id="genderErrorId" class="hero-form__error text-sm text-danger">
          {{ errors.gender }}
        </p>
      </fieldset>

      <BaseField
        v-slot="{ id, describedBy, invalid, errorId }"
        label="Image URL"
        :hint="IMAGE_HINT"
        :error="errors.image"
        class="hero-form__field"
      >
        <BaseInput
          :id
          v-model="image"
          v-bind="imageEvents"
          name="image"
          type="url"
          inputmode="url"
          autocomplete="url"
          :placeholder="IMAGE_PLACEHOLDER"
          required
          :aria-describedby="describedBy"
          :aria-invalid="invalid"
          :aria-errormessage="errorId"
        />
      </BaseField>

      <BaseButton type="submit" variant="primary" class="hero-form__submit self-start">
        Create hero
      </BaseButton>
    </div>

    <ImagePreview :url="image" />
  </form>
</template>
