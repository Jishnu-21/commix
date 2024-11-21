const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const multer = require('multer');
const authenticate = require('../middleware/userAuth');
const addressValidation = require('../middleware/addressValidation');

// Use memory storage for multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });

router.get('/:userId',authenticate,userController.getUserDetails);
router.put('/update', authenticate, upload.single('profile_picture'), userController.updateUser);
router.post('/address', authenticate, addressValidation, userController.addAddress);
router.put('/address/:addressId', authenticate, addressValidation, userController.updateAddress);
router.delete('/address/:addressId', authenticate, userController.deleteAddress);
router.get('/addresses',authenticate, userController.getAddresses);

module.exports = router;