const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const multer = require('multer');
const authenticate = require('../middleware/userAuth');

// Use memory storage for multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });

router.get('/:userId',authenticate,userController.getUserDetails);
router.put('/update', authenticate, upload.single('profile_picture'), userController.updateUser);


module.exports = router;