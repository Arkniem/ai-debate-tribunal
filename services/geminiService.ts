
import { GoogleGenAI } from "@google/genai";
import { Debater, Message } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const formatHistory = (history: Message[]): string => {
    if (history.length === 0) {
        return "The debate has not started yet.";
    }
    return history.map(m => `${m.author}: ${m.text}`).join('\n\n');
};

export const getAIResponse = async (
    topic: string,
    debater: Debater,
    history: Message[]
): Promise<string> => {
    const stance = debater === Debater.Alpha ? 'FOR' : 'AGAINST';
    const opponent = debater === Debater.Alpha ? Debater.Beta : Debater.Alpha;

    const systemInstruction = `You are ${debater}, a highly analytical and critical AI. You are participating in a debate.
Your designated stance is to argue ${stance} the topic: "${topic}".

Your goal is to engage in a rigorous, yet fair and constructive debate. You must identify weaknesses, logical fallacies, and gaps in your opponent's arguments. Formulate and present counter-arguments that are well-supported and compelling. Maintain a respectful and intellectual tone throughout the debate, avoiding personal attacks.

Debating Style:
a) Carefully analyze your opponent's (${opponent}) latest argument to identify its core tenets and potential flaws.
b) When presenting a counter-argument, use clear, concise, and logical reasoning.
c) Ask probing questions to encourage your opponent to elaborate on their points, which may reveal further weaknesses.
d) Introduce evidence and facts to support your claims where appropriate.
e) Your response must not exceed 4 sentences in length.
f) Use clear and accessible language. Avoid jargon, overly complex sentences, and advanced vocabulary to ensure the debate is easy for a general audience to follow.

Tone and Conduct:
a) Maintain a 'brutal' but fair debating style. This means being relentless in dissecting arguments, but never resorting to insults or condescension.
b) The focus should always be on the merit of the arguments, not the person making them.
c) Do not use introductory fluff like "That's an interesting point, but...". Get straight to the counter-argument.
d) If the debate has not started yet, provide a strong opening statement for your side.
e) If your opponent's arguments are overwhelmingly convincing and you can no longer formulate a coherent counter-argument, you must concede the debate. To do so, your response must begin with the exact phrase: "I concede."
`;

    const prompt = `
        The debate topic is: "${topic}"
        Your stance: ${stance}

        This is the debate transcript so far:
        ${formatHistory(history)}

        It is now your turn. As ${debater}, present your argument or counter-argument. Keep your response focused, concise, and analytical.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
                topP: 0.9,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating content:", error);
        return "I am unable to continue the debate due to a technical error.";
    }
};