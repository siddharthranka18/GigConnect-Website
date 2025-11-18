const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Added 'required: true'
  ratings: { type: Number, min: 0, max: 5, default: 0}, // Changed from 'rate' to 'ratings' (Number)
  experience: { type: Number, required: true },
  distance: { type: Number, default: 0 }, // Distance can be dynamic, but a default can be useful
  photo: String, // Path to image
  contact: { type: String, unique: true, sparse: true }, // Assumes contact (e.g. email) should be unique
  description: String,
  city: { type: String, required: true },
  skills: {type:[String],required:true}, // NEW: Array of skills for filtering/searching
  isVerified: { type: Boolean, default: false }, // NEW: Verification status
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Worker', WorkerSchema);