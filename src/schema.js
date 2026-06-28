import { z } from 'zod';

// ---- Esquema Zod (validacion semantica tras recibir la respuesta) ----
const mealSchema = z.object({
  name: z.string().min(1),
  ingredients: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(1),
  protein_estimate: z.string().min(1),
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
    meal1: mealSchema,
    meal2: mealSchema,
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

// ---- JSON Schema para OpenAI Structured Outputs (strict) ----
// Debe coincidir con el Zod de arriba. strict => todo en "required" y
// additionalProperties:false en cada objeto.
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
          meal1: mealJsonSchema,
          meal2: mealJsonSchema,
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
        required: ['meal1', 'meal2', 'lactation_extra'],
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
      'title',
      'date',
      'nutrition',
      'walking',
      'strength_man',
      'strength_woman',
      'shopping_list',
      'hydration',
      'safety_note',
    ],
  },
};
