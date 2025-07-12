
import { GoogleGenAI } from "@google/genai";
import { MASTER_PROMPT_TEMPLATE, MODEL_ANSWER_PROMPT_TEMPLATE } from "../constants";
import type { EvaluationConfig, Source } from "../types";

function buildPrompt(config: EvaluationConfig, answer: string): string {
  let paperDisplay = config.paper;
  if (config.phase === 'Optional/Specialized Paper' && config.optionalPart) {
    paperDisplay = `${config.paper} (${config.optionalPart})`;
  }
  
  let prompt = MASTER_PROMPT_TEMPLATE
    .replace('{exam}', config.exam)
    .replace('{phase}', config.phase)
    .replace('{paper}', paperDisplay)
    .replace('{section}', config.section || 'N/A')
    .replace('{question}', config.question)
    .replace(/{marks}/g, String(config.marks))
    .replace('{wordLimit}', String(config.wordLimit))
    .replace('{answer}', answer);
    
  if (config.phase === 'Precis Writing' && config.originalPassage) {
    const passageBlock = `

[ORIGINAL PASSAGE BLOCK]
ORIGINAL PASSAGE:
${config.originalPassage}
`;
    prompt = prompt.replace('{original_passage_block}', passageBlock);
  } else {
    prompt = prompt.replace('{original_passage_block}', '');
  }
  
  return prompt;
}

function buildModelAnswerPrompt(config: EvaluationConfig): string {
  let paperDisplay = config.paper;
  if (config.phase === 'Optional/Specialized Paper' && config.optionalPart) {
    paperDisplay = `${config.paper} (${config.optionalPart})`;
  }

  let prompt = MODEL_ANSWER_PROMPT_TEMPLATE
    .replace('{exam}', config.exam)
    .replace('{phase}', config.phase)
    .replace('{paper}', paperDisplay)
    .replace('{section}', config.section || 'N/A')
    .replace('{question}', config.question)
    .replace('{marks}', String(config.marks))
    .replace('{wordLimit}', String(config.wordLimit));

  if (config.phase === 'Precis Writing' && config.originalPassage) {
    const passageBlock = `
[ORIGINAL PASSAGE BLOCK]
ORIGINAL PASSAGE:
${config.originalPassage}
`;
    prompt = prompt.replace('{original_passage_block}', passageBlock);
  } else {
    prompt = prompt.replace('{original_passage_block}', '');
  }

  return prompt;
}

async function runStream(
    request: any,
    onStream: (chunk: string) => void,
    onError: (error: Error) => void,
    onEnd: (data: { sources?: Source[] }) => void
) {
    const sourcesMap = new Map<string, Source>();
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const stream = await ai.models.generateContentStream(request);

        for await (const chunk of stream) {
            if (chunk.text) {
                onStream(chunk.text);
            }

            const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks) {
                groundingChunks.forEach((gc: any) => {
                    if (gc.web && gc.web.uri && !sourcesMap.has(gc.web.uri)) {
                        sourcesMap.set(gc.web.uri, {
                            uri: gc.web.uri,
                            title: gc.web.title || gc.web.uri,
                        });
                    }
                });
            }
        }
        onEnd({ sources: Array.from(sourcesMap.values()) });
    } catch (err) {
        console.error("Gemini API Error:", err);
        if (err instanceof Error) {
            if (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')) {
                onError(new Error('The Google Gemini API Key is invalid or not set up in the environment.'));
            } else {
                onError(err);
            }
        } else {
            onError(new Error('An unknown error occurred during the API call.'));
        }
        onEnd({});
    }
}


export async function evaluateAnswerStream(
  config: EvaluationConfig,
  answer: string,
  useWebSearch: boolean,
  onStream: (chunk: string) => void,
  onError: (error: Error) => void,
  onEnd: (data: { sources: Source[] }) => void
) {
  const prompt = buildPrompt(config, answer);
  
  const request: any = {
    model: 'gemini-2.5-flash',
    contents: prompt,
  };

  if (useWebSearch) {
      request.config = {
          tools: [{googleSearch: {}}]
      };
  }
  
  await runStream(request, onStream, onError, (data) => onEnd({ sources: data.sources || []}));
}

export async function generateModelAnswerStream(
  config: EvaluationConfig,
  onStream: (chunk: string) => void,
  onError: (error: Error) => void,
  onEnd: () => void
) {
    const prompt = buildModelAnswerPrompt(config);

    const request = {
        model: 'gemini-2.5-flash',
        contents: prompt,
    };
    
    await runStream(request, onStream, onError, () => onEnd());
}