import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const openai = new OpenAI();

const model = process.env.NODE_ENV === 'production' ? 'gpt-4o' : 'gpt-4o-mini';

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

async function callChatCompletion(messages: { role: string, name: string, content: string }[]): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: model,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
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
    const messages = [
      { role: 'developer', name: 'developer', content: systemPrompt },
      { role: 'user', name: 'user', content: `Input text: '${input}'\nPrompt: '${prompt}'` }
    ]
    const response = await callChatCompletion(messages);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return "An unknown error occurred";
  }
}

export async function summarize(input: string): Promise<string> {
  const summarizeDeveloperPrompt = `
    You are a helpful assistant that summarizes text.
    You will not include any other text in your response.

    You condense and shorten text while preserving the original meaning.
    You are extremely good at this.
  `;
  try {
    const messages = [
      { role: 'developer', name: 'developer', content: summarizeDeveloperPrompt },
      { role: 'user', name: 'user', content: input }
    ]
    const response = await callChatCompletion(messages);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return "An unknown error occurred";
  }
}

export async function runSimpleChat(messages: { role: string, name: string, content: string }[], brevity: boolean): Promise<string> {
  // Can you insert developer messages into the message history? Even if you can -- don't do it twice
  // if (brevity) {
  //   messages.push({ role: 'developer', name: 'developer', content: 'Please keep the response reasonably concise.' })
  // }

  try {
    const response = await callChatCompletion(messages);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return "An unknown error occurred";
  }
}
