import OpenAI from "openai";
import dotenv from "dotenv";
import { TransformationModel } from "@wb/shared-types";
import { Database as db } from "./db";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const openai = new OpenAI();

const systemPrompt = `
  You will be given a transformation prompt, an input text, and a number of expected outputs.
  You will use the transformation prompt to respond to the requested transformation.
  You will produce the expected number of outputs.
  Before each output, you will add a separate line that says "BEGIN OUTPUT".
  You will not include any other text in your response.

  For example, for the prompt:
  Input text: A person crosses the street\nTransformation prompt: Possible reasons\nOutputs: 3
  You would respond with:
  BEGIN OUTPUT
  The person may want to buy something on the other side of the street
  BEGIN OUTPUT
  The person might work on the other side of the street
  BEGIN OUTPUT
  The person might be visiting a friend on the other side of the street
`;

async function callChatCompletion(prompt: string, inputText: string, expectedOutputs: number): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Input text: '${inputText}'\nTransformation prompt: '${prompt}'\nOutputs: ${expectedOutputs}` }
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

export interface TransformationResult {
  childTransformations: TransformationModel[];
  outputs: number;
  errors: string[];
}

export async function runTransformation(transformation: TransformationModel, userId: string): Promise<TransformationResult> {
  const childTransformations: TransformationModel[] = [];
  const errors: string[] = [];

  const inputBlock = await db.getBlock(transformation.input_block_id, userId);
  if (!inputBlock) {
    return { childTransformations, outputs: 0, errors: ["Input block not found"] }
  }

  const inputBlockContent = inputBlock.content;
  const prompt = transformation.prompt;
  const expectedOutputs = transformation.outputs;
  const position = transformation.position;
  if (!position) {
    return { childTransformations, outputs: 0, errors: ["Transformation position not found"] };
  }

  try {
    // Call the LLM
    const response = await callChatCompletion(prompt, inputBlockContent, expectedOutputs);
    console.log(response);

    // Parse the response
    const localOutputs = response.split('BEGIN OUTPUT');

    // Create or update the output blocks
    let outputCount = 0;
    for (const output of localOutputs) {
      if (output.length === 0) {
        // Skip any empty outputs
        console.debug('Skipping empty output');
        continue;
      }

      // If a block already exists at the target position, update its content instead of creating a new one
      const position = `${inputBlock.position}.${transformation.position}:${outputCount}`;
      const existingBlock = await db.getBlockAtPosition(transformation.group_id, position, userId);

      if (existingBlock && existingBlock.locked) {
        console.debug(`Will not update output block at position ${position}: Block is locked`);

      } else if (existingBlock) {
        await db.updateBlock(existingBlock._id, output, userId);
        // Get the transformations that belong to this output block, if any
        const outputBlockTransformations = await db.getTransformationsByInputBlockId(existingBlock._id, userId);
        // Add them to the childTransformations array
        childTransformations.push(...outputBlockTransformations);

      } else {
        const outputBlockId = await db.createBlock(userId, transformation.group_id, output, position);
        if (!outputBlockId) {
          errors.push(`Could not create output block at position ${position}`);
          continue;
        }
        await db.createTransformationOutput(transformation._id, outputBlockId);
      }

      outputCount++;
    }

    return { childTransformations, outputs: outputCount, errors };
  } catch (error) {
    return { childTransformations, outputs: 0, errors: [error instanceof Error ? error.message : "Unknown error"] };
  }
}

