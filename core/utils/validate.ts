import { z, ZodError } from 'zod';
import { RouteError } from './route-error.ts';

// Schemas Base Reutilizáveis no Zod v4
export const emailSchema = z
  .email('email inválido')
  .trim()
  .min(1, 'email obrigatório')
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(10, 'a senha deve ter no mínimo 10 caracteres')
  .max(256, 'a senha deve ter no máximo 256 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'a senha deve conter letras maiúsculas, minúsculas e números',
  );

export const filenameSchema = z
  .string()
  .trim()
  .min(1, 'nome de arquivo obrigatório')
  .regex(/^(?!\.)[A-Za-z0-9._-]+$/, 'nome de arquivo inválido');

export const slugSchema = z
  .string()
  .trim()
  .min(1, 'slug obrigatório')
  .regex(/^[a-z0-9-_]+$/, 'slug inválido');

// Schemas do Módulo Auth
export const registerUserSchema = z.object({
  name: z.string().trim().min(1, 'nome obrigatório'),
  username: z.string().trim().min(1, 'username obrigatório'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'senha obrigatória'),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(1, 'senha atual obrigatória'),
  new_password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'token obrigatório'),
  new_password: passwordSchema,
});

// Schemas do Módulo LMS
export const courseUpsertSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, 'título obrigatório'),
  description: z.string().trim().min(1, 'descrição obrigatória'),
  lessons: z.coerce.number().int().min(1, 'total de aulas deve ser maior que 0'),
  hours: z.coerce.number().int().min(1, 'carga horária deve ser maior que 0'),
});

export const lessonUpsertSchema = z.object({
  courseSlug: slugSchema,
  slug: slugSchema,
  title: z.string().trim().min(1, 'título obrigatório'),
  description: z.string().trim().min(1, 'descrição obrigatória'),
  video: z.string().trim().min(1, 'vídeo obrigatório'),
  seconds: z.coerce.number().int().nonnegative('segundos inválidos'),
  order: z.coerce.number().int().positive('ordem deve ser maior que 0'),
  free: z.coerce.number().int().min(0).max(1).default(0),
});

export const completeLessonSchema = z.object({
  courseId: z.coerce.number().int().positive('courseId inválido'),
  lessonId: z.coerce.number().int().positive('lessonId inválido'),
});

export const resetCourseSchema = z.object({
  courseId: z.coerce.number().int().positive('courseId inválido'),
});

// Helper de parsing seguro que traduz ZodError para RouteError(422)
export function parseSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new RouteError(422, firstIssue?.message || 'dados inválidos');
  }
  return result.data;
}

// Objeto 'v' utilitário baseado em Zod v4 para compatibilidade e conveniência
export const v = {
  string: (x: unknown) => parseSchema(z.string().trim().min(1, 'string esperada'), x),
  number: (x: unknown) => parseSchema(z.coerce.number(), x),
  boolean: (x: unknown) => parseSchema(z.coerce.boolean(), x),
  email: (x: unknown) => parseSchema(emailSchema, x),
  password: (x: unknown) => parseSchema(passwordSchema, x),
  file: (x: unknown) => parseSchema(filenameSchema, x),
  slug: (x: unknown) => parseSchema(slugSchema, x),
};

export { z, ZodError };
