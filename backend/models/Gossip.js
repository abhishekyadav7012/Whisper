const GossipSchema = new mongoose.Schema({
  username: String,
  text: String,
  // GeoJSON format
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  createdAt: { type: Date, default: Date.now }
});

// Location par 2dsphere index banana zaroori hai geospatial queries ke liye
GossipSchema.index({ location: "2dsphere" });
module.exports = mongoose.model('Gossip', GossipSchema);