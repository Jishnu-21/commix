const express = require('express');
const productController = require('../controller/ProductController');
const authenticate = require('../middleware/Adminauth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();



// Routes
router.post('/add', upload.single('image'),productController.addProduct)
;router.patch('/block/:id', authenticate, productController.blockProduct);
router.put('/edit/:id', authenticate, productController.editProduct);

module.exports = router;