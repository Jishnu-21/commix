const express = require('express');
const router = express.Router();
const offerController = require('../controller/OfferController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/add', upload.single('image'), offerController.addOffer);
router.put('/edit/:offerId', upload.single('image'), offerController.editOffer);
router.delete('/delete/:offerId', offerController.deleteOffer);
router.get('/', offerController.getAllOffers);
router.get('/active-offers', offerController.getActiveOffers);
router.post('/apply-offer', offerController.applyOffer);
module.exports = router;