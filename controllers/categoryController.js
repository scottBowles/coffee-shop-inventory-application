const Category = require('../models/category');

exports.category_home = function categoryHome(req, res, next) {
  Category.find()
    .populate('numItems')
    .sort({ name: 'ascending' })
    .exec((err, categories) => {
      if (err) { return next(err); }
      res.render('categoriesHome', { title: 'Categories', categories });
    });
};

exports.category_detail = function categoryDetail(req, res, next) {
  res.send(`NOT IMPLEMENTED: Category detail: ${req.params.id}`);
};

exports.category_create_get = function categoryCreateGet(req, res, next) {
  res.send('NOT IMPLEMENTED: Category create GET');
};

exports.category_create_post = function categoryCreatePost(req, res, next) {
  res.send('NOT IMPLEMENTED: Category create POST');
};

exports.category_update_get = function categoryUpdateGet(req, res, next) {
  res.send('NOT IMPLEMENTED: Category update GET');
};

exports.category_update_post = function categoryUpdatePost(req, res, next) {
  res.send('NOT IMPLEMENTED: Category update POST');
};

exports.category_delete_get = function categoryDeleteGet(req, res, next) {
  res.send('NOT IMPLEMENTED: Category delete GET');
};

exports.category_delete_post = function categoryDeletePost(req, res, next) {
  res.send('NOT IMPLEMENTED: Category delete POST');
};
