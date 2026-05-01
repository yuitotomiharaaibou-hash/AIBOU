/** qaContext の「追加して」等を、新規タスクとして具体化（AI JSON と適用層で共有） */
export type AiTaskCreatePatch = {
  title: string;
  subject: "english" | "math";
  date: string;
  hour?: number;
  importance?: "A" | "B" | "C";
  notes?: string;
};
