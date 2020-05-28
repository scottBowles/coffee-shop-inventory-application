const validator = require("express-validator");
const Category = require("../models/category");

exports.category_home = function categoryHome(req, res, next) {
  Category.find()
    .populate("numItems")
    .sort({ name: "ascending" })
    .exec((err, categories) => {
      if (err) {
        return next(err);
      }
      res.render("categoriesHome", { title: "Categories", categories });
    });
};

exports.category_detail = function categoryDetail(req, res, next) {
  Category.findById(req.params.id)
    .populate("items")
    .exec((err, category) => {
      if (err) {
        return next(err);
      }
      res.render("categoryDetail", { title: category.name, category });
    });
};

exports.category_create_get = function categoryCreateGet(req, res, next) {
  res.render("categoryForm", { title: "Create New Category" });
};

exports.category_create_post = [
  validator.body("name", "Category name required").trim().isLength({ min: 1 }),
  validator
    .body("description", "Category description required")
    .trim()
    .isLength({ min: 1 }),
  validator.sanitizeBody("name").escape(),
  validator.sanitizeBody("description").escape(),

  (req, res, next) => {
    const errors = validator.validationResult(req);

    const category = new Category({
      name: req.body.name,
      description: req.body.description,
    });

    if (!errors.isEmpty()) {
      res.render("categoryForm", {
        title: "Create New Category",
        category,
        errors: errors.array(),
      });
    } else {
      Category.findOne({ name: req.body.name }).exec((err, foundCategory) => {
        if (err) {
          return next(err);
        }
        if (foundCategory) {
          res.redirect(foundCategory.url);
        } else {
          category.save((categorySaveError) => {
            if (categorySaveError) {
              return next(categorySaveError);
            }
            res.redirect(category.url);
          });
        }
      });
    }
  },
];

exports.category_update_get = function categoryUpdateGet(req, res, next) {
  Category.findById(req.params.id).exec((err, category) => {
    if (err) {
      return next(err);
    }
    if (category === null) {
      const notFoundError = new Error("Category not found");
      notFoundError.status = 404;
      return next(notFoundError);
    }
    res.render("categoryForm", {
      title: `Update Category: ${category.name}`,
      category,
    });
  });
};

exports.category_update_post = [
  validator.body("name", "Category name required").trim().isLength({ min: 1 }),
  validator
    .body("description", "Category description required")
    .trim()
    .isLength({ min: 1 }),
  validator.sanitizeBody("name").escape(),
  validator.sanitizeBody("description").escape(),

  (req, res, next) => {
    const errors = validator.validationResult(req);

    const category = new Category({
      name: req.body.name,
      description: req.body.description,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      res.render("categoryForm", {
        title: `Update Category: ${req.body.name}`,
        category,
        errors: errors.array(),
      });
    } else {
      Category.findByIdAndUpdate(req.params.id, category).exec(
        (err, newCategory) => {
          if (err) {
            return next(err);
          }
          res.redirect(newCategory.url);
        }
      );
    }
  },
];

exports.category_delete_get = function categoryDeleteGet(req, res, next) {
  res.send("NOT IMPLEMENTED: Category delete GET");
};

exports.category_delete_post = function categoryDeletePost(req, res, next) {
  res.send("NOT IMPLEMENTED: Category delete POST");
};
