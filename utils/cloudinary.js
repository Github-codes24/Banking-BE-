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

const uploadToCloudinary = async (filePath, originalName, retries = 3) => {
  console.log(`Uploading: ${originalName || 'unnamed file'} from ${filePath}`);
  
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error("File path is invalid or file doesn't exist");
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mime.lookup(ext);
    
    let resourceType = "auto";
    if (ext === '.pdf') {
      resourceType = "auto";
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      resourceType = "image";
    }
    
    console.log(`File type: ${mimeType}, Resource type: ${resourceType}`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          timeout: 60000,
          use_filename: true,
          unique_filename: true, // Let Cloudinary handle uniqueness
          // Remove filename_override to avoid the error
        },
        async (error, result) => {
          try {
            if (fs.existsSync(filePath)) {
              await fs.promises.unlink(filePath).catch(console.error);
            }

            if (error) {
              console.error('Cloudinary error:', error);
              if (retries > 0) {
                console.log(`Retrying upload (${retries} attempts left)...`);
                await new Promise(res => setTimeout(res, 1000 * (4 - retries)));
                return resolve(await uploadToCloudinary(filePath, originalName, retries - 1));
              }
              throw error;
            }

            console.log('Upload successful:', result.secure_url);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }
      );

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(uploadStream);
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath).catch(console.error);
    }
    throw error;
  }
};
module.exports = uploadToCloudinary