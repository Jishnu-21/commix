const Career = require('../models/career');

const createCareer = async (req, res) => {
    const { name, location, job_type, description, income, deadline } = req.body;
    const career = await Career.create({ name, location, job_type, description, income, deadline });
    res.status(201).json(career);
};  


const getAllCareers = async (req, res) => {
    const careers = await Career.find();
    res.status(200).json(careers);
};  

const getCareerById = async (req, res) => {
    const { id } = req.params;
    const career = await Career.findById(id);
    res.status(200).json(career);
};  

module.exports = {
    createCareer,
    getAllCareers,
    getCareerById,
};  


