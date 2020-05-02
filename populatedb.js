#! /usr/bin/env node

console.log('This script populates some test orders, items, and categories to your database. Specified database as argument - e.g.: populatedb mongodb+srv://cooluser:coolpassword@cluster0-mbdj7.mongodb.net/local_library?retryWrites=true');

// Get arguments passed on command line
var userArgs = process.argv.slice(2);
/*
if (!userArgs[0].startsWith('mongodb')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}
*/
var async = require('async')
var Order = require('./models/order')
var Item = require('./models/item')
var Category = require('./models/category')


var mongoose = require('mongoose');
var mongoDB = userArgs[0];
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var orders = []
var items = []
var categories = []

function orderCreate(orderDate, deliveryDate, received, orderedItems, cb) {
  const order = new Order({ orderDate, deliveryDate, received, orderedItems });
       
  order.save(function (err) {
    if (err) {
      cb(err, null)
      return
    }
    console.log('New Order: ' + order);
    orders.push(order)
    cb(null, order)
  }  );
}

function itemCreate(name, quantityInStock, lastUpdated, category, sku, price, description, quantityOnOrder, cb) {
  const itemdetail = { name: name, quantityInStock: quantityInStock, lastUpdated: lastUpdated };
  if (category != false) itemdetail.category = category
  if (sku != false) itemdetail.sku = sku
  if (price != false) itemdetail.price = price
  if (description != false) itemdetail.description = description
  if (quantityOnOrder != false) itemdetail.quantityOnOrder = quantityOnOrder

  var item = new Item(itemdetail);
       
  item.save(function (err) {
    if (err) {
      cb(err, null);
      return;
    }
    console.log('New Item: ' + item);
    items.push(item)
    cb(null, item);
  }   );
}

function categoryCreate(name, description, cb) {
  var category = new Category({ name: name, description: description });    
  category.save(function (err) {
    if (err) {
      cb(err, null)
      return
    }
    console.log('New Category: ' + category);
    categories.push(category)
    cb(null, category)
  }  );
}



function createOrders(cb) { 
    async.series([
        function(callback) {
          orderCreate(2020-04-24, 2020-04-28, true, [{item: items[6], quantity: 8}], callback);
        },
        function(callback) {
          orderCreate(2020-04-20, 2020-04-24, true, [{item: items[1], quantity: 6}, {item: items[4], quantity: 6}, {item: items[5], quantity: 4}], callback);
        },
        function(callback) {
          orderCreate(2020-05-01, 2020-05-05, false, [{item: items[2], quantity: 4}, {item: items[3], quantity: 8}], callback);
        }
        ],
        // optional callback
        cb);
}

// name, quantityInStock, lastUpdated, category, sku, 
// price, description, quantityOnOrder
function createItems(cb) {
    async.parallel([
        function(callback) {
          itemCreate('Napkins', 8, 2020-03-25, categories[3], 'Not marked for sale', undefined, 'Napkins - 1000ea', undefined, callback);
        },
        function(callback) {
          itemCreate('Caramel Syrup', 4, 2020-04-24, categories[0], 0001, 5.20, 'Caramel Syrup 750 ml/25.4 oz', 6, callback);
        },
        function(callback) {
          itemCreate('Dark Roast 5lb', 4, 2020-04-09, categories[1], 'Not marked for sale', undefined, 'Dark Roast 5lb Bullet for Brewed Coffee', 4, callback);
        },
        function(callback) {
          itemCreate('Espresso 5lb', 6, 2020-04-09, categories[1], 'Not marked for sale', undefined, 'Espresso 5lb Bullet for Espresso Machine', 4, callback);
        },
        function(callback) {
          itemCreate('Vanilla Syrup', 8, 2020-04-24, categories[0], 0004, 5.20, 'Vanilla Syrup 750 ml/25.4 oz', 6, callback);
        },
        function(callback) {
          itemCreate('Decaf Espresso 5lb', 3, 2020-04-24, categories[1], 'Not marked for sale', undefined, 'Decaf Espresso 5lb Bullet for Espresso Machine', 4, callback);
        },
        function(callback) {
          itemCreate('Milk Whole', 8, 2020-04-28, categories[2], 0006, 3.90, 'Whole Milk for Beverages', 8, callback);
        }
        ],
        // optional callback
        cb);
}


function createCategories(cb) {
    async.parallel([
        function(callback) {
          categoryCreate('Syrups', 'Syrup bottles for beverages', callback)
        },
        function(callback) {
          categoryCreate('Coffee', 'Coffee, non-retail', callback)
        },
        function(callback) {
          categoryCreate('Milks', 'Milks, non-retail', callback)
        },
        function(callback) {
          categoryCreate('Miscellaneous', 'Miscellany', callback)
        }
        ],
        // Optional callback
        cb);
}



async.series([
    createCategories,
    createItems,
    createOrders
],
// Optional callback
function(err, results) {
    if (err) {
        console.log('FINAL ERR: '+err);
    }
    else {
        console.log('Orders: '+orders);
        
    }
    // All done, disconnect from database
    mongoose.connection.close();
});

