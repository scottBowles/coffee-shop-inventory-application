const { validationResult } = require('express-validator');
const fs = require('fs');
const Category = require('../models/category');
const { uploadImage } = require('./utils');
const validate = require('./validate');
const { NotFoundError } = require('./errors');

exports.category_home = function categoryHome(req, res, next) {
  Category.find({}, 'name description')
    .populate('numItems')
    .sort({ name: 'ascending' })
    .exec((err, categories) => {
      if (err) return next(err);
      return res.render('categoriesHome', { title: 'Categories', categories });
    });
};

exports.category_detail = [
  validate.id({ message: 'Invalid category id' }),

  function categoryDetail(req, res, next) {
    // Check for validation errors. If errors, rerender category detail page.
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render('categoryDetail', { title: 'Category Detail', errors });
    }
    // Find category, handle errors, render page
    Category.findById(req.params.id)
      .populate({
        path: 'items',
        match: { active: true },
        select: 'name quantityInStock sku price',
      })
      .exec((err, category) => {
        if (err) return next(err);
        if (category === null) {
          return next(NotFoundError('Category not found'));
        }
        return res.render('categoryDetail', { title: category.name, category });
      });
  },
];

exports.category_create_get = function categoryCreateGet(req, res, next) {
  res.render('categoryForm', { title: 'Create New Category' });
};

exports.category_create_post = [
  uploadImage,
  validate.category(),
  validate.password(),

  (req, res, next) => {
    const { errors } = validationResult(req);
    // create new category with the post data
    const category = new Category({
      name: req.body.name,
      description: req.body.description,
      image: req.file && {
        data: fs.readFileSync(req.file.path),
        contentType: req.file.mimetype,
      },
    });
    // handle validation errors
    if (errors.length > 0) {
      return res.render('categoryForm', {
        title: 'Create New Category',
        category,
        errors,
      });
    }
    // If a category with the given name already exists, redirect to the existing category page.
    // Otherwise, save the new category and redirect to its newly-created page.
    Category.findOne({ name: req.body.name }).exec((err, foundCategory) => {
      if (err) return next(err);
      if (foundCategory) return res.redirect(foundCategory.url);
      category.save((saveError) => {
        if (saveError) return next(saveError);
        return res.redirect(category.url);
      });
    });
  },
];

exports.category_update_get = [
  validate.id({ message: 'Invalid category id' }),

  function categoryUpdateGet(req, res, next) {
    // handle any validation errors
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render('categoryForm', { title: 'Update Category', errors });
    }

    // find the category, handle error conditions, and render update form
    Category.findById(req.params.id).exec((err, category) => {
      if (err) return next(err);
      if (category === null) {
        return next(NotFoundError('Category not found'));
      }
      return res.render('categoryForm', {
        title: `Update Category: ${category.name}`,
        category,
      });
    });
  },
];

exports.category_update_post = [
  uploadImage,
  validate.category(),
  validate.id({ message: 'Invalid Category Id' }),
  validate.password(),

  (req, res, next) => {
    const category = new Category({
      name: req.body.name,
      description: req.body.description,
      image: req.file && {
        data: fs.readFileSync(req.file.path),
        contentType: req.file.mimetype,
      },
      _id: req.params.id,
    });

    const { errors } = validationResult(req);

    if (errors.length > 0) {
      return res.render('categoryForm', {
        title: `Update Category: ${req.body.name}`,
        category,
        errors,
      });
    }

    // no errors. update category and redirect.
    Category.findByIdAndUpdate(req.params.id, category).exec(
      (err, newCategory) => {
        if (err) return next(err);
        if (newCategory === null) {
          return next(NotFoundError('Category not found'));
        }
        return res.redirect(newCategory.url);
      }
    );
  },
];

exports.category_delete_get = [
  validate.id({ message: 'Invalid category id' }),

  async function categoryDeleteGet(req, res, next) {
    try {
      const { errors } = validationResult(req);
      if (errors.length > 0) {
        return res.render('categoryDelete', {
          title: 'Remove Category',
          errors,
        });
      }
      // Get category
      const category = await Category.findById(req.params.id)
        .populate('items', 'name quantityInStock sku price')
        .exec();

      // If no category is found, redirect
      if (category === null) return res.redirect('/inventory/categories');

      // Render page
      return res.render('categoryDelete', {
        title: `Remove Category: ${category.name}`,
        category,
      });
    } catch (error) {
      return next(error);
    }
  },
];

exports.category_delete_post = [
  validate.password(),
  validate.id({ message: 'Invalid category id' }),

  async function categoryDeletePost(req, res, next) {
    // handle validation error
    const { errors } = validationResult(req);

    if (errors.length > 0) {
      // Get category
      const category = await Category.findById(req.params.id)
        .populate('items', 'name quantityInStock sku price')
        .exec();

      // If no category is found, redirect
      if (category === null) return res.redirect('/inventory/categories');

      return res.render('categoryDelete', {
        title: `Remove Category: ${category.name}`,
        category,
        errors,
      });
    }

    // get category, populating items
    const deletedCategory = await Category.findByIdAndRemove(req.params.id)
      .populate('items', 'category')
      .exec();

    // get each item in category and change item's category to undefined
    await Promise.all(
      deletedCategory.items.map((item) => {
        item.category = undefined;
        return item.save();
      })
    ).catch((err) => next(err));

    return res.redirect('/inventory/categories');
  },
];
