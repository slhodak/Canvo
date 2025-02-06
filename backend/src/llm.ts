import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const openai = new OpenAI();

const model = 'gpt-4o-mini';

const systemPrompt = `
  You will be given a prompt, and an input text.
  You will use the prompt to transform the input text.
  You will not include any other text in your response.

  For example, for the prompt:
  Input text: A person crosses the street
  Prompt: A possible reason

  You could respond with:
  The person might work on the other side of the street.
`;

async function callChatCompletion(prompt: string, inputText: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Input text: '${inputText}'\nPrompt: '${prompt}'` }
    ],
    temperature: 0.7,
    n: 1
  });

  const response = completion.choices[0].message.content
  if (!response) {
    throw new Error("Could not get output from OpenAI");
  }
  return response;
}

export async function runPrompt(prompt: string, input: string): Promise<string> {
  try {
    const response = await callChatCompletion(prompt, input);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return "An unknown error occurred";
  }
}

