import type { FilePart } from "ai";

/**
 * Creates a function to upload base64 images from FilePart to R2
 * @param r2Bucket The R2 bucket to upload to
 * @returns A function that uploads a FilePart to R2
 */
export function createUploadBase64Image(
  r2Bucket: R2Bucket
): (key: string, filePart: FilePart) => Promise<void> {
  return async (key: string, filePart: FilePart): Promise<void> => {
    if (!("data" in filePart) || !filePart.data) {
      console.warn(`FilePart has no data property`);
      return;
    }

    const data = filePart.data;
    let fileData: Blob | ArrayBuffer | string;

    // Handle different data types
    if (data instanceof Blob) {
      fileData = data;
    } else if (data instanceof ArrayBuffer) {
      fileData = data;
    } else if (typeof data === "string") {
      // Check if it's a base64 data URL (data:image/png;base64,...)
      if (data.startsWith("data:")) {
        // Extract base64 part after the comma
        const base64Data = data.split(",")[1];
        if (base64Data) {
          // Convert base64 string to ArrayBuffer
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          fileData = bytes.buffer;
        } else {
          fileData = data;
        }
      } else {
        fileData = data;
      }
    } else if (data instanceof ReadableStream) {
      // Convert ReadableStream to ArrayBuffer
      const reader = data.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          chunks.push(result.value);
        }
      }

      // Combine chunks into single ArrayBuffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      fileData = combined.buffer;
    } else {
      // Fallback: try to convert to string
      fileData = String(data);
    }

    await r2Bucket.put(key, fileData);
  };
}
