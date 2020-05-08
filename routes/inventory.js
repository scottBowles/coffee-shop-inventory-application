const express = require('express');
const router = express.Router();

const category_controller = require('../controllers/categoryController');
const item_controller = require('../controllers/itemController');
const order_controller = require('../controllers/orderController');
const receiving_controller = require('../controllers/receivingController');

// GET inventory home page
router.get('/', order_controller.index);

/// RECEIVING ROUTES ///

// GET request for updating a receipt
router.get('/receiving/create-new', receiving_controller.receipt_create_get);

// POST request for updating a receipt
router.post('/receiving/create-new', receiving_controller.receipt_create_post);

// GET request for updating a receipt
router.get('/receiving/:id/update', receiving_controller.receipt_update_get);

// POST request for updating a receipt
router.post('/receiving/:id/update', receiving_controller.receipt_update_post);

// GET request for deleting a receipt
router.get('/receiving/:id/remove', receiving_controller.receipt_delete_get);

// POST request for deleting a receipt
router.post('/receiving/:id/remove', receiving_controller.receipt_delete_post);

// GET request for one receipt
router.get('/receiving/:id', receiving_controller.receipt_detail);

// GET receiving home page
router.get('/receiving', receiving_controller.receiving_home);

/// COUNT ROUTES ///

// GET request for updating a count
router.get('/count/create-new', inventory_count_controller.count_create_get);

// POST request for updating a count
router.post('/count/create-new', inventory_count_controller.count_create_post);

// GET request for updating a count
router.get('/count/:id/update', inventory_count_controller.count_update_get);

// POST request for updating a count
router.post('/count/:id/update', inventory_count_controller.count_update_post);

// GET request for deleting a count
router.get('/count/:id/remove', inventory_count_controller.count_delete_get);

// POST request for deleting a count
router.post('/count/:id/remove', inventory_count_controller.count_delete_post);

// GET request for one count
router.get('/count/:id', inventory_count_controller.count_detail);

// GET inventory count home page
router.get('/counts', inventory_count_controller.count_home);

/// ITEM ROUTES ///

// GET request for creating an item
router.get('/item/create-new', item_controller.item_create_get);

// POST request for creating an item
router.post('/item/create-new', item_controller.item_create_post);

// GET request for updating an item
router.get('/item/:id/update', item_controller.item_update_get);

// POST request for updating an item
router.post('/item/:id/update', item_controller.item_update_post);

// GET request for deleting an item
router.get('/item/:id/remove', item_controller.item_delete_get);

// POST request for deleting an item
router.post('/item/:id/remove', item_controller.item_delete_post);

// GET request for one item
router.get('/item/:id', item_controller.item_detail);

// GET request for item home page
router.get('/items', item_controller.item_home);

/// ORDER ROUTES ///

// GET request for creating an order
router.get('/order/create-new', order_controller.order_create_get);

// POST request for creating an order
router.post('/order/create-new', order_controller.order_create_post);

// GET request for updating an order
router.get('/order/:id/update', order_controller.order_update_get);

// POST request for updating an order
router.post('/order/:id/update', order_controller.order_update_post);

// GET request for deleting an order
router.get('/order/:id/remove', order_controller.order_delete_get);

// POST request for deleting an order
router.post('/order/:id/remove', order_controller.order_delete_post);

// GET request for one order
router.get('/order/:id', order_controller.order_detail);

// GET request for order home page
router.get('/orders', order_controller.order_home);

/// CATEGORY ROUTES ///

// GET request for creating an category
router.get('/category/create-new', category_controller.category_create_get);

// POST request for creating an category
router.post('/category/create-new', category_controller.category_create_post);

// GET request for updating an category
router.get('/category/:id/update', category_controller.category_update_get);

// POST request for updating an category
router.post('/category/:id/update', category_controller.category_update_post);

// GET request for deleting an category
router.get('/category/:id/remove', category_controller.category_delete_get);

// POST request for deleting an category
router.post('/category/:id/remove', category_controller.category_delete_post);

// GET request for one category
router.get('/category/:id', category_controller.category_detail);

// GET request for category home page
router.get('/categories', category_controller.category_home);


module.exports = router;