const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const REQUIRED_CLOUDINARY_ENV = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imagenes JPG, PNG o WebP'));
    }
    cb(null, true);
  }
}).single('image');

function uploadMiddleware(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();

    const isTooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(isTooLarge ? 413 : 400).json({
      error: isTooLarge ? 'La imagen no debe pesar mas de 3 MB' : err.message
    });
  });
}

async function uploadImage(req, res) {
  const missing = REQUIRED_CLOUDINARY_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    return res.status(500).json({
      error: `Faltan variables de Cloudinary: ${missing.join(', ')}`
    });
  }

  if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });

  try {
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'tsj-foodies/restaurantes',
          resource_type: 'image',
          transformation: [
            { width: 900, height: 900, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => error ? reject(error) : resolve(result)
      );

      stream.end(req.file.buffer);
    });

    res.status(201).json({ url: uploaded.secure_url });
  } catch (e) {
    console.error('uploadImage:', e.message);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
}

module.exports = { uploadMiddleware, uploadImage };
