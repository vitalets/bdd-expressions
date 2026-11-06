/**
 * Defines DocString step argument options and resolves supplied string values.
 */

export type DocStringParameterType<T = unknown> = {
  readonly name: string;
  readonly docString: true;
  transform(world: unknown, value: string): T | PromiseLike<T>;
};

export type DocStringParameterTypeOptions<T = string, World = unknown> = {
  name: string;
  docString: true;
  transformer?: (this: World, text: string) => T | PromiseLike<T>;
};

/**
 * Creates a step argument binding that preserves the supplied string unless transformed.
 */
export function createDocStringParameterType<T = string, World = unknown>(
  options: DocStringParameterTypeOptions<T, World>,
) {
  const type: DocStringParameterType<T> = {
    name: options.name,
    docString: true,
    transform(world, value) {
      return options.transformer ? options.transformer.call(world as World, value) : (value as T);
    },
  };
  return type;
}
