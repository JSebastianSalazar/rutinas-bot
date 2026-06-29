import { z } from 'zod';

// ---- Esquema Zod ----
const mealSchema = z.object({
  name: z.string().min(1),
  ingredients: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(1),
  protein_estimate: z.string().min(1),
});

const snackSchema = z.object({
  name: z.string().min(1),
  ingredients: z.array(z.string().min(1)).min(1),
  // Groq a veces usa 'note' o 'instructions'; aceptamos cualquiera
  description: z.string().optional().default(''),
  note: z.string().optional(),
  instructions: z.string().optional(),
});

const exerciseBlockSchema = z.object({
  warmup: z.array(z.string().min(1)).min(1),
  exercises: z.array(z.string().min(1)).min(1),
  cooldown: z.array(z.string().min(1)).min(1),
});

export const dailyPlanSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  nutrition: z.object({
    breakfast_man: mealSchema,   // puede incluir huevos
    breakfast_woman: mealSchema, // SIN huevos
    lunch: mealSchema,           // compartido
    snack: snackSchema,          // algo/merienda compartida
    lactation_extra: z.object({
      name: z.string().min(1),
      ingredients: z.array(z.string().min(1)).min(1),
      reason: z.string().min(1),
    }),
  }),
  walking: z.object({
    goal: z.string().min(1),
    instructions: z.string().min(1),
  }),
  strength_man: exerciseBlockSchema,
  strength_woman: exerciseBlockSchema,
  shopping_list: z.array(z.string().min(1)).min(1),
  hydration: z.string().min(1),
  safety_note: z.string().min(1),
});

// ---- JSON Schema para Structured Outputs (OpenAI) / modo json_object (Groq) ----
const strArray = { type: 'array', items: { type: 'string' } };

const mealJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    ingredients: strArray,
    steps: strArray,
    protein_estimate: { type: 'string' },
  },
  required: ['name', 'ingredients', 'steps', 'protein_estimate'],
};

const snackJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    ingredients: strArray,
    description: { type: 'string' },
  },
  required: ['name', 'ingredients', 'description'],
};

const exerciseBlockJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    warmup: strArray,
    exercises: strArray,
    cooldown: strArray,
  },
  required: ['warmup', 'exercises', 'cooldown'],
};

export const dailyPlanJsonSchema = {
  name: 'daily_plan',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      date: { type: 'string' },
      nutrition: {
        type: 'object',
        additionalProperties: false,
        properties: {
          breakfast_man: mealJsonSchema,
          breakfast_woman: mealJsonSchema,
          lunch: mealJsonSchema,
          snack: snackJsonSchema,
          lactation_extra: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              ingredients: strArray,
              reason: { type: 'string' },
            },
            required: ['name', 'ingredients', 'reason'],
          },
        },
        required: ['breakfast_man', 'breakfast_woman', 'lunch', 'snack', 'lactation_extra'],
      },
      walking: {
        type: 'object',
        additionalProperties: false,
        properties: {
          goal: { type: 'string' },
          instructions: { type: 'string' },
        },
        required: ['goal', 'instructions'],
      },
      strength_man: exerciseBlockJsonSchema,
      strength_woman: exerciseBlockJsonSchema,
      shopping_list: strArray,
      hydration: { type: 'string' },
      safety_note: { type: 'string' },
    },
    required: [
      'title', 'date', 'nutrition', 'walking',
      'strength_man', 'strength_woman',
      'shopping_list', 'hydration', 'safety_note',
    ],
  },
};
