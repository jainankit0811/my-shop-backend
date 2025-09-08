const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price image stock');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    res.json({
      success: true,
      message: 'Cart retrieved successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Get cart error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching cart',
      error: error.message
    });
  }
});

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/add', auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      const newQuantity = cart.items[existingItemIndex].quantity + Number(quantity);
      
      if (product.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: 'Cannot add more items. Insufficient stock available'
        });
      }
      
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity: Number(quantity)
      });
    }

    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.product', 'name price image stock');

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Add to cart error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while adding to cart',
      error: error.message
    });
  }
});

// @route   POST /api/cart/remove
// @desc    Remove item from cart
// @access  Private
router.post('/remove', auth, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Remove item from cart
    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.product', 'name price image stock');

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Remove from cart error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while removing from cart',
      error: error.message
    });
  }
});

// @route   POST /api/cart/update
// @desc    Update item quantity in cart
// @access  Private
router.post('/update', auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and quantity are required'
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    // Check product stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Find and update item quantity
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    cart.items[itemIndex].quantity = Number(quantity);
    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.product', 'name price image stock');

    res.json({
      success: true,
      message: 'Cart updated successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Update cart error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating cart',
      error: error.message
    });
  }
});

// @route   DELETE /api/cart
// @desc    Clear cart
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Clear cart error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while clearing cart',
      error: error.message
    });
  }
});

module.exports = router;