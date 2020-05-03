const express = require('express');
const router = express.Router();

const category_controller = require('../controllers/categoryController');
const item_controller = require('../controllers/itemController');
const order_controller = require('../controllers/orderController');
const inventory_controller = require('../controllers/inventoryController');

/// INVENTORY ROUTES ///

// GET inventory home page
router.get('/', inventory_controller.index);

// GET receiving home page
router.get('/receiving', inventory_controller.receiving_home);

// GET request for receiving items
router.get('/receiving/receive-items', inventory_controller.receive_items_get);

// POST request for receiving items
router.post('/receiving/receive-items', inventory_controller.receive_items_post);

// GET request for receiving an order
router.get('/receiving/:id', inventory_controller.receive_order_get);

// POST request for receiving an order
router.get('/receiving/:id', inventory_controller.receive_order_post);

// GET request for updating inventory
router.get('/inventory-count', inventory_controller.update_inventory_get);

// POST request for updating inventory
router.post('/inventory-count', inventory_controller.update_inventory_post);

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

// GET request for list of all items
router.get('/items', item_controller.item_list);

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

// GET request for list of all orders
router.get('/orders', order_controller.order_list);

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

// GET request for list of all categories
router.get('/categories', category_controller.category_list);


module.exports = router;