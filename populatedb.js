#! /usr/bin/env node

console.log('This script populates some test books, authors, genres and bookinstances to your database. Specified database as argument - e.g.: populatedb mongodb+srv://cooluser:coolpassword@cluster0-mbdj7.mongodb.net/local_library?retryWrites=true');

// Get arguments passed on command line
var userArgs = process.argv.slice(2);
/*
if (!userArgs[0].startsWith('mongodb')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}
*/
var async = require('async')
var Stock = require('./models/stock')
var Item = require('./models/item')
var Category = require('./models/category')


var mongoose = require('mongoose');
var mongoDB = userArgs[0];
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var stockitems = []
var items = []
var categories = []

function stockCreate(item, status, expirationDate, receivedDate, cb) {
  stockdetail = { item: item, status: status }
  if (expirationDate != false) stockdetail.expirationDate = expirationDate
  if (receivedDate != false) stockdetail.receivedDate = receivedDate
  
  var stock = new Stock(stockdetail);
       
  stock.save(function (err) {
    if (err) {
      cb(err, null)
      return
    }
    console.log('New Stock: ' + stock);
    stockitems.push(stock)
    cb(null, stock)
  }  );
}

function itemCreate(name, forsale, category, sku, price, description, maxShelfLifeInDays, cb) {
  var item = new Item({ name: name, forsale: forsale, category: category, sku: sku, price: price, description: description, maxShelfLifeInDays: maxShelfLifeInDays });
       
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



function createStocks(cb) { 
    async.series([
        function(callback) {
          stockCreate(items[1], 'ordered', undefined, undefined, callback);
        },
        function(callback) {
          stockCreate(items[2], 'received', undefined, undefined, callback);
        },
        function(callback) {
          stockCreate(items[3], 'received', 2020-09-25, 2020-03-25, callback);
        },
        function(callback) {
          stockCreate(items[4], 'received', 2020-06-18, 2020-03-18, callback);
        },
        function(callback) {
          stockCreate(items[5], 'ordered', undefined, undefined, callback);
        },
        function(callback) {
          stockCreate(items[6], 'ordered', undefined, undefined, callback);
        },
        function(callback) {
          stockCreate(items[0], 'ordered', undefined, undefined, callback);
        },
        ],
        // optional callback
        cb);
}


function createItems(cb) {
    async.parallel([
        function(callback) {
          itemCreate('Napkins', false, categories[3], 0007, undefined, 'Napkins - 1000ea', 720, callback);
        },
        function(callback) {
          itemCreate('Caramel Syrup', true, categories[0], 0001, 5.20, 'Caramel Syrup 750 ml/25.4 oz', 180, callback);
        },
        function(callback) {
          itemCreate('Dark Roast 5lb', false, categories[1], 0002, undefined, 'Dark Roast 5lb Bullet for Brewed Coffee', 90, callback);
        },
        function(callback) {
          itemCreate('Espresso 5lb', false, categories[1], 0003, undefined, 'Espresso 5lb Bullet for Espresso Machine', 90, callback);
        },
        function(callback) {
          itemCreate('Vanilla Syrup', true, categories[0], 0004, 5.20, 'Vanilla Syrup 750 ml/25.4 oz', 180, callback);
        },
        function(callback) {
          itemCreate('Decaf Espresso 5lb', false, categories[1], 0005, undefined, 'Decaf Espresso 5lb Bullet for Espresso Machine', 90, callback);
        },
        function(callback) {
          itemCreate('Milk Whole', false, categories[2], 0006, undefined, 'Whole Milk for Beverages', 14, callback);
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
    createStocks
],
// Optional callback
function(err, results) {
    if (err) {
        console.log('FINAL ERR: '+err);
    }
    else {
        console.log('Stocks: '+stockitems);
        
    }
    // All done, disconnect from database
    mongoose.connection.close();
});




