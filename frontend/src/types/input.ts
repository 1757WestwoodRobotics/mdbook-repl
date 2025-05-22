import z from "zod";

const Input = z.object({
  status: z.enum(["query", "idle"]),
  data: z.any(),
  notifier: z.any()
});

const Inputs = z.object({
  python: Input,
  typescript: Input,
  javascript: Input
});

type InputType = z.infer<typeof Input>;
type InputsType = z.infer<typeof Inputs>;

export { Input, Inputs };
export type { InputType, InputsType };
