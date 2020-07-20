const { body, param, validationResult } = require("express-validator");
const Category = require("../models/category");

exports.category_home = function categoryHome(req, res, next) {
  Category.find()
    .populate("numItems")
    .sort({ name: "ascending" })
    .exec((err, categories) => {
      if (err) {
        return next(err);
      }
      return res.render("categoriesHome", { title: "Categories", categories });
    });
};

exports.category_detail = function categoryDetail(req, res, next) {
  Category.findById(req.params.id)
    .populate("items")
    .exec((err, category) => {
      if (err) {
        return next(err);
      }
      if (category == null) {
        return res.redirect("/inventory/categories");
      }
      return res.render("categoryDetail", { title: category.name, category });
    });
};

exports.category_create_get = function categoryCreateGet(req, res, next) {
  res.render("categoryForm", { title: "Create New Category" });
};

exports.category_create_post = [
  body("name", "Category name required").trim().isLength({ min: 1 }).escape(),
  body("description", "Category description required")
    .trim()
    .isLength({ min: 1 })
    .escape(),

  (req, res, next) => {
    const errors = validationResult(req);

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
          return res.redirect(foundCategory.url);
        }
        category.save((categorySaveError) => {
          if (categorySaveError) {
            return next(categorySaveError);
          }
          return res.redirect(category.url);
        });
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
    return res.render("categoryForm", {
      title: `Update Category: ${category.name}`,
      category,
    });
  });
};

exports.category_update_post = [
  body("name", "Category name required").trim().isLength({ min: 1 }).escape(),
  body("description", "Category description required")
    .trim()
    .isLength({ min: 1 })
    .escape(),

  (req, res, next) => {
    const errors = validationResult(req);

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

exports.category_delete_get = async function categoryDeleteGet(req, res, next) {
  try {
    // Get category
    const category = await Category.findById(req.params.id)
      .populate("items")
      .exec();

    // If no category is found, redirect
    if (category == null) {
      return res.redirect("/inventory/categories");
    }

    // Render page
    return res.render("categoryDelete", {
      title: `Remove Category: ${category.name}`,
      category,
    });
  } catch (error) {
    return next(error);
  }
};

exports.category_delete_post = async function categoryDeletePost(
  req,
  res,
  next
) {
  // validate/sanitize
  // get category, populating items
  const category = await Category.findByIdAndRemove(req.params.id)
    .populate("items")
    .exec();
  // get each item in category and change item's category to undefined
  const savedItems = [];
  category.items.forEach((item) => {
    item.category = undefined;
    const savedItem = item.save();
    savedItems.push(savedItem);
  });
  await Promise.all(savedItems).catch((err) => next(err));
  res.redirect("/inventory/categories");

  // change each item's category to undefined
  // save each item
  // Category.findByIdAndRemove(req.body.id).exec().catch(err => next(err))
  // res.redirect("/inventory/categories");
};
