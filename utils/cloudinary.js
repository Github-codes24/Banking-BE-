const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const { promisify } = require("util");
const stream = require("stream");
const pipeline = promisify(stream.pipeline);
const path = require("path");
const mime = require("mime-types");
// Configure with retry logic
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 60000 // Increase timeout to 60 seconds
});

const uploadToCloudinary = async (filePath, retries = 3) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error("File path is invalid or file doesn't exist");
    }

    const ext = path.extname(filePath);
    const mimeType = mime.lookup(ext);

    // Force 'raw' for PDF, otherwise use 'auto'
    const resourceType = mimeType === "application/pdf" ? "raw" : "auto";

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          timeout: 60000,
        },
        async (error, result) => {
          try {
            // Always clean up file
            if (fs.existsSync(filePath)) {
              await fs.promises.unlink(filePath).catch(console.error);
            }

            if (error) {
              if (retries > 0) {
                console.log(`Retrying upload (${retries} attempts left)...`);
                await new Promise(res => setTimeout(res, 1000 * (4 - retries)));
                return resolve(await uploadToCloudinary(filePath, retries - 1));
              }
              throw error;
            }

            resolve(result);
          } catch (err) {
            reject(err);
          }
        }
      );

      const readStream = fs.createReadStream(filePath);

      readStream.on("error", (err) => {
        uploadStream.destroy();
        reject(err);
      });

      uploadStream.on("error", (err) => {
        readStream.destroy();
        reject(err);
      });

      pipeline(readStream, uploadStream).catch(reject);
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath).catch(console.error);
    }
    throw error;
  }
};
module.exports = uploadToCloudinary