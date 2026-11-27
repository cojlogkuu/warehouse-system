import { ValidateBy, type ValidationOptions } from 'class-validator'

/**
 * Requires a string of at most the given number of UTF-8 bytes. Unlike `IsByteLength` of
 * class-validator it does not throw on malformed Unicode.
 *
 * @param maxBytes - Largest accepted size in bytes.
 * @param validationOptions - Options of class-validator.
 * @returns The property decorator.
 */
export function MaxByteLength(
  maxBytes: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxByteLength',
      constraints: [maxBytes],
      validator: {
        validate: (text: unknown) =>
          typeof text === 'string' && Buffer.byteLength(text) <= maxBytes,
        defaultMessage: () => '$property must be at most $constraint1 bytes long',
      },
    },
    validationOptions,
  )
}
