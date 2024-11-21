const mongoose = require('mongoose');
const careerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    job_type: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    income: {
        type: String,
        required: true,
    },
    deadline: {
        type: Date,
        required: true, 
    },
}, {
    timestamps: true
});

const Career = mongoose.model('Career', careerSchema);

module.exports = Career;
