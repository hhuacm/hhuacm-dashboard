import { z } from "zod";

type RuntimeEnv = Record<string, string | undefined>;

const emptyStringAsUndefined = (env: RuntimeEnv) =>
  Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      key,
      value === "" ? undefined : value,
    ])
  );

export const parseEnv = <Shape extends z.ZodRawShape>(
  shape: Shape,
  env: RuntimeEnv = process.env
) => z.object(shape).parse(emptyStringAsUndefined(env));
