
const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  desciption: { type: String, required: true, unique: true },
  image_url: [{ type: String }],
  content: { type: String, required: true },
  author: { type: String, required: true },
  author_image_url: { type: String, required: true },
  author_description: { type: String, required: true },
  category: { type: String, required: true },
  tags: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Blog', BlogSchema);
