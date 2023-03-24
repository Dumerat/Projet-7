const multer = require('multer');

const MIME_TYPES = { //extension du fichier
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images'); //destination du stockage de nos images
  },
  filename: (req, file, callback) => {
    const name = file.originalname.split(' ').join('_');
    const extension = MIME_TYPES[file.mimetype];
    callback(null, name + Date.now() + '.' + extension); //nom de notre fichier, Date.now() permet un nom unique du fichier à notre échelle
  }
});

module.exports = multer({storage: storage}).single('image');