
const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  desciption: { type: String, required: true, unique: true },
  image_url: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Blog', BlogSchema);
