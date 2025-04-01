import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs/promises";
import mime from "mime-types";
import path from "path";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("Please set the GOOGLE_API_KEY environment variable.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

/**
 * Uploads the given file to Gemini.
 *
 * See https://ai.google.dev/gemini-api/docs/prompting_with_media
 */
async function uploadToGemini(filepath, mimeType) {
  const uploadResult = await fileManager.uploadFile(filepath, {
    mimeType,
    displayName: path.basename(filepath),
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}

async function run() {
  // Define the model specifically for image generation
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseModalities: ["image", "text"],
  };

  // Path to your image file
  const imagePath = path.join(__dirname, "test_image.png");

  const mimeType = mime.lookup(imagePath) || "image/png";

  const uploadedFile = await uploadToGemini(imagePath, mimeType);

  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

  const result = await chatSession.sendMessage([
    {
      fileData: {
        mimeType: uploadedFile.mimeType,
        fileUri: uploadedFile.uri,
      },
    },
    { text: "Add a pirate ship to this image" },
  ]);

  const candidates = result.response.candidates;
  if (!candidates || candidates.length === 0) {
    console.log("No candidates returned");
    return;
  }

  for (
    let candidateIndex = 0;
    candidateIndex < candidates.length;
    candidateIndex++
  ) {
    const parts = candidates[candidateIndex].content.parts;

    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];

      // Handle inline data (direct image response)
      if (part.inlineData) {
        try {
          const filename = `edited_image.${mime.extension(
            part.inlineData.mimeType
          )}`;

          await fs.writeFile(
            filename,
            Buffer.from(part.inlineData.data, "base64")
          );

          console.log(`Edited image saved to: ${filename}`);
        } catch (err) {
          console.error("Error saving image:", err);
        }
      }

      // Handle file data (reference to stored file)
      else if (part.fileData) {
        console.log(`File response received: ${part.fileData.fileUri}`);
        // You would need to download this file separately
      }
    }
  }
}

run().catch(console.error);
