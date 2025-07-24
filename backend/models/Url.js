const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  userAgent: {
    type: String,
    default: ''
  },
  ip: {
    type: String,
    default: ''
  }
});

const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: [true, 'Original URL is required'],
    trim: true,
    validate: {
      validator: function(url) {
        // Basic URL validation
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Please provide a valid URL'
    }
  },
  shortCode: {
    type: String,
    required: [true, 'Short code is required'],
    unique: true,
    trim: true,
    minlength: [6, 'Short code must be at least 6 characters'],
    maxlength: [8, 'Short code cannot exceed 8 characters']
  },
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner user ID is required']
  },
  clickCount: {
    type: Number,
    default: 0,
    min: [0, 'Click count cannot be negative']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: null
  },
  clicks: [clickSchema]
}, {
  timestamps: true
});

// Indexes for performance
urlSchema.index({ shortCode: 1 });
urlSchema.index({ ownerUserId: 1 });
urlSchema.index({ createdAt: -1 });

// Method to increment click count
urlSchema.methods.recordClick = function(userAgent = '', ip = '') {
  this.clickCount += 1;
  this.lastAccessed = new Date();
  
  // Add click record (limit to last 1000 clicks to prevent document size issues)
  this.clicks.push({
    timestamp: new Date(),
    userAgent: userAgent.substring(0, 200), // Limit user agent length
    ip: ip
  });
  
  // Keep only last 1000 clicks
  if (this.clicks.length > 1000) {
    this.clicks = this.clicks.slice(-1000);
  }
  
  return this.save();
};

// Static method to find by short code
urlSchema.statics.findByShortCode = function(shortCode) {
  return this.findOne({ shortCode });
};

// Virtual for full short URL
urlSchema.virtual('shortUrl').get(function() {
  return `${process.env.BASE_URL}/${this.shortCode}`;
});

// Ensure virtual fields are serialized
urlSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Url', urlSchema);
