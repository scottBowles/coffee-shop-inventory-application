const multer = require("multer");

module.exports.upload = multer({
  dest: "public/images/",
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/jpg$|png$|jpeg/)) {
      cb(new Error("Filetype must be .png, .jpg or .jpeg"), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fieldSize: 1000000 },
});
