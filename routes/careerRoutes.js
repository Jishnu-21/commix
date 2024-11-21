const express = require('express');
const router = express.Router();
const { 
    createCareer,
    getAllCareers,
    getCareerById,
} = require('../controller/careerController');

router.post('/create', createCareer);
router.get('/all', getAllCareers);
router.get('/:id', getCareerById);

module.exports = router;
