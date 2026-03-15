import { z, ZodSchema, ZodError } from 'zod'
import { AppError } from './errors'

/**
 * Validate a request body against a Zod schema.
 * Throws AppError(422) with structured error messages on failure.
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    throw new AppError('Invalid JSON in request body', 400, 'INVALID_JSON')
  }

  try {
    return schema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of err.issues) {
        const path = issue.path.join('.') || 'body'
        fieldErrors[path] = issue.message
      }
      throw new AppError(
        `Validation failed: ${Object.values(fieldErrors).join(', ')}`,
        422,
        'VALIDATION_ERROR'
      )
    }
    throw err
  }
}

/**
 * Validate query parameters against a Zod schema.
 */
export function validateQuery<T>(
  url: URL,
  schema: ZodSchema<T>
): T {
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  try {
    return schema.parse(params)
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of err.issues) {
        const path = issue.path.join('.') || 'query'
        fieldErrors[path] = issue.message
      }
      throw new AppError(
        `Invalid query parameters: ${Object.values(fieldErrors).join(', ')}`,
        400,
        'INVALID_QUERY'
      )
    }
    throw err
  }
}

// ===========================
// Reusable Zod schemas
// ===========================

export const emailSchema = z.string().email('Invalid email format').max(255)

export const phoneSchema = z
  .string()
  .regex(/^(\+44|0)[0-9]{9,10}$/, 'Invalid UK phone number')

export const postcodeSchema = z
  .string()
  .regex(
    /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i,
    'Invalid UK postcode'
  )

export const currencySchema = z
  .number()
  .min(0, 'Must be a positive number')
  .max(999999.99, 'Value too large')

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
  .min(3)
  .max(60)

export const uuidSchema = z.string().uuid('Invalid ID format')
