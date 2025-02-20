export type LLMResponse = {
  status: 'success' | 'error';
  result: string;
  error?: string;
}

