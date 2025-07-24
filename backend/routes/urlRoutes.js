const express = require('express');
const { nanoid } = require('nanoid');
const { body, validationResult } = require('express-validator');
const QRCode = require('qrcode');
const Url = require('../models/Url');
const auth = require('../middleware/auth');

const router = express.Router();

// Validate URL function
const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// @route   POST /api/shorten
// @desc    Create a short URL
// @access  Private
router.post('/shorten', [
  auth,
  body('originalUrl')
    .trim()
    .isLength({ min: 1 })
    .withMessage('URL is required')
    .custom((value) => {
      if (!isValidUrl(value)) {
        throw new Error('Please provide a valid URL (must start with http:// or https://)');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { originalUrl } = req.body;
    const userId = req.userId;

    // Check if URL already exists for this user
    const existingUrl = await Url.findOne({ 
      originalUrl: originalUrl.trim(),
      ownerUserId: userId 
    });

    if (existingUrl) {
      // Generate QR Code for existing URL
      let qrCodeDataURL;
      try {
        qrCodeDataURL = await QRCode.toDataURL(existingUrl.shortUrl, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (qrError) {
        console.error('QR Code generation error:', qrError);
        qrCodeDataURL = null;
      }

      return res.json({
        success: true,
        message: 'URL already shortened',
        data: {
          shortUrl: existingUrl.shortUrl,
          shortCode: existingUrl.shortCode,
          originalUrl: existingUrl.originalUrl,
          clickCount: existingUrl.clickCount,
          createdAt: existingUrl.createdAt,
          qrCode: qrCodeDataURL
        }
      });
    }

    // Generate unique short code
    let shortCode;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortCode = nanoid(7); // Generate 7-character code
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error('Failed to generate unique short code');
      }
    } while (await Url.findByShortCode(shortCode));

    // Create new URL document
    const newUrl = new Url({
      originalUrl: originalUrl.trim(),
      shortCode,
      ownerUserId: userId
    });

    await newUrl.save();

    // Generate QR Code for the short URL
    let qrCodeDataURL;
    try {
      qrCodeDataURL = await QRCode.toDataURL(newUrl.shortUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (qrError) {
      console.error('QR Code generation error:', qrError);
      qrCodeDataURL = null;
    }

    res.status(201).json({
      success: true,
      message: 'URL shortened successfully',
      data: {
        shortUrl: newUrl.shortUrl,
        shortCode: newUrl.shortCode,
        originalUrl: newUrl.originalUrl,
        clickCount: newUrl.clickCount,
        createdAt: newUrl.createdAt,
        qrCode: qrCodeDataURL
      }
    });

  } catch (error) {
    console.error('URL shortening error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Short code already exists, please try again'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during URL shortening'
    });
  }
});

// @route   GET /api/urls
// @desc    Get user's URLs with analytics
// @access  Private
router.get('/urls', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get URLs with pagination
    const urls = await Url.find({ ownerUserId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalUrls = await Url.countDocuments({ ownerUserId: userId });
    const totalPages = Math.ceil(totalUrls / limit);

    // Format response data
    const formattedUrls = urls.map(url => ({
      id: url._id,
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      clickCount: url.clickCount,
      createdAt: url.createdAt,
      lastAccessed: url.lastAccessed,
      recentClicks: url.clicks ? url.clicks.slice(-10) : [] // Last 10 clicks
    }));

    res.json({
      success: true,
      data: {
        urls: formattedUrls,
        pagination: {
          currentPage: page,
          totalPages,
          totalUrls,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get URLs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving URLs'
    });
  }
});

// @route   GET /api/urls/:id
// @desc    Get specific URL with detailed analytics
// @access  Private
router.get('/urls/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const url = await Url.findOne({ 
      _id: id, 
      ownerUserId: userId 
    }).lean();

    if (!url) {
      return res.status(404).json({
        success: false,
        message: 'URL not found'
      });
    }

    // Calculate daily click statistics
    const clicksByDay = {};
    if (url.clicks) {
      url.clicks.forEach(click => {
        const day = new Date(click.timestamp).toISOString().split('T')[0];
        clicksByDay[day] = (clicksByDay[day] || 0) + 1;
      });
    }

    res.json({
      success: true,
      data: {
        id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
        clickCount: url.clickCount,
        createdAt: url.createdAt,
        lastAccessed: url.lastAccessed,
        clicks: url.clicks || [],
        analytics: {
          clicksByDay,
          totalClicks: url.clickCount
        }
      }
    });

  } catch (error) {
    console.error('Get URL details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving URL details'
    });
  }
});

// @route   DELETE /api/urls/:id
// @desc    Delete user's URL
// @access  Private
router.delete('/urls/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const url = await Url.findOneAndDelete({ 
      _id: id, 
      ownerUserId: userId 
    });

    if (!url) {
      return res.status(404).json({
        success: false,
        message: 'URL not found or you do not have permission to delete it'
      });
    }

    res.json({
      success: true,
      message: 'URL deleted successfully',
      data: {
        deletedUrl: {
          id: url._id,
          shortCode: url.shortCode,
          originalUrl: url.originalUrl
        }
      }
    });

  } catch (error) {
    console.error('Delete URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting URL'
    });
  }
});

// @route   PUT /api/urls/:id
// @desc    Update URL (original URL only)
// @access  Private
router.put('/urls/:id', [
  auth,
  body('originalUrl')
    .trim()
    .isLength({ min: 1 })
    .withMessage('URL is required')
    .custom((value) => {
      if (!isValidUrl(value)) {
        throw new Error('Please provide a valid URL (must start with http:// or https://)');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { originalUrl } = req.body;
    const userId = req.userId;

    const url = await Url.findOne({ 
      _id: id, 
      ownerUserId: userId 
    });

    if (!url) {
      return res.status(404).json({
        success: false,
        message: 'URL not found or you do not have permission to update it'
      });
    }

    url.originalUrl = originalUrl.trim();
    await url.save();

    res.json({
      success: true,
      message: 'URL updated successfully',
      data: {
        id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: url.shortUrl,
        clickCount: url.clickCount,
        createdAt: url.createdAt
      }
    });

  } catch (error) {
    console.error('Update URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating URL'
    });
  }
});

module.exports = router;
