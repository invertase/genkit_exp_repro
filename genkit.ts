import { genkit } from "genkit";
import { googleAI, gemini20FlashExp } from "@genkit-ai/googleai";
import fs from "fs/promises";
import path from "path";

const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
});

async function editImage() {
  // Read the image file and convert to base64
  const imagePath = path.join(__dirname, "test_image.png");
  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const dataUrl = `data:image/jpeg;base64,${base64Image}`;

  const response = await ai.generate({
    model: gemini20FlashExp,
    messages: [
      {
        role: "user",
        content: [
          {
            text: "Add a pirate ship to this image",
          },
          { media: { url: dataUrl, contentType: "image/png" } },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE"],
    },
  });

  console.log(response.text);
}

editImage().catch(console.error);
