exports.index = function (req, res, next) {
   res.render('index', {title: 'Caf\351 Corcovado Inventory', current: 'inventory'})
};

exports.receiving_home = function (req, res, next) {
   res.send('NOT IMPLEMENTED');
};

exports.receive_items_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED');
};

exports.receive_items_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED');
};

exports.update_inventory_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED');
};

exports.update_inventory_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED');
};

exports.receive_order_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED');
};

exports.receive_order_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED');
};