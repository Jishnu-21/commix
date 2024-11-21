const express = require('express');
const router = express.Router();
const { 
  subscribeToNewsletter, 
  unsubscribeFromNewsletter,
} = require('../controller/newsletterController');

router.post('/subscribe', subscribeToNewsletter);
router.post('/unsubscribe', unsubscribeFromNewsletter);


router.get('/unsubscribe/:email', unsubscribeFromNewsletter); // Use GET for unsubscribe link

module.exports = router;