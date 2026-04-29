const mongoose = require('mongoose');

// Comment ke liye chota schema
const CommentSchema = new mongoose.Schema({
  username: { type: String, default: "Anonymous" },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ThoughtSchema = new mongoose.Schema({
  content: { type: String, required: true },
  username: { type: String, default: "Anonymous" },
  mood: { type: String, default: "😊" },
  
  // Topic/Category field
  category: { type: String, default: "All" },

  // Images array to store base64 data
  images: { type: [String], default: [] },

  // Videos array to store base64 data
  videos: { type: [String], default: [] },

  // Files array: { url: base64, fileName: string, fileType: string }
  files: { type: [{ url: String, fileName: String, fileType: String }], default: [] },
  
  // Likes aur Dislikes arrays
  likes: { type: [String], default: [] },
  dislikes: { type: [String], default: [] },
  
  // Comments array
  comments: { type: [CommentSchema], default: [] },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Thought', ThoughtSchema);