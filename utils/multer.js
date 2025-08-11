const multer = require("multer");
const os = require("os");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, os.tmpdir());
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

// const fileFilter = (req, file, cb) => {
//   if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid file type'), false);
//   }
// };

const upload = multer({
  storage,
  // fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
