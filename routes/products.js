const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const router = express.Router(); // Router initialization moved to top

// Multer Cloudinary storage setup
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 400, height: 400, crop: 'limit' }],
  },
});
const upload = multer({ storage });

// @route   POST /api/products/upload
// @desc    Upload product image to Cloudinary
// @access  Private (Admin only)
router.post('/upload', auth, isAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    // Cloudinary returns the image URL in req.file.path
    res.json({ success: true, imageUrl: req.file.path });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Image upload failed', error: error.message });
  }
});

// @route   GET /api/products
// @desc    Get all products with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, page = 1, limit = 12 } = req.query;

    // Build query object
    const query = {};

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query with pagination
    const products = await Product.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: error.message
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product retrieved successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Get product error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Admin only)
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { name, description, price, category, stock, image, featured } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, description, price, and category'
      });
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      image: image || undefined,
      featured: Boolean(featured)
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while creating product',
      error: error.message
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Admin only)
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { name, description, price, category, stock, image, featured } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price !== undefined ? Number(price) : product.price;
    product.category = category || product.category;
    product.stock = stock !== undefined ? Number(stock) : product.stock;
    product.image = image || product.image;
    product.featured = featured !== undefined ? Boolean(featured) : product.featured;

    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Update product error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating product',
      error: error.message
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Admin only)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Delete product error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product',
      error: error.message
    });
  }
});

module.exports = router;