const { body, param, validationResult } = require("express-validator");
const multer = require("multer");
const fs = require("fs");
const Category = require("../models/category");

const upload = multer({
  dest: "../public/images/",
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/jpg$|png$|jpeg/)) {
      cb(new Error("Filetype must be .png, .jpg or .jpeg"), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fieldSize: 1000000 },
});

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

exports.category_detail = [
  param("id").isMongoId().withMessage("Invalid category id").escape(),

  function categoryDetail(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("categoryDetail", { title: "Category Detail", errors });
    }
    Category.findById(req.params.id)
      .populate("items")
      .exec((err, category) => {
        if (err) {
          return next(err);
        }
        if (category === null) {
          const notFoundError = new Error("Category not found");
          notFoundError.status = 404;
          return next(notFoundError);
        }
        const filteredItems = category.items.filter((item) => !!item.active);
        return res.render("categoryDetail", {
          title: category.name,
          category,
          items: filteredItems,
        });
      });
  },
];

exports.category_create_get = function categoryCreateGet(req, res, next) {
  res.render("categoryForm", { title: "Create New Category" });
};

exports.category_create_post = [
  upload.single("imageUpload"),
  body("name", "Category name required").trim().isLength({ min: 1 }).escape(),
  body("description", "Category description required")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("password")
    .custom((value) => {
      if (value !== process.env.ADMIN_PASSWORD) {
        throw new Error("Invalid password");
      }
      return true;
    })
    .escape(),

  (req, res, next) => {
    const { errors } = validationResult(req);

    const category = new Category({
      name: req.body.name,
      description: req.body.description,
      image:
        req.file === undefined
          ? undefined
          : {
              data: fs.readFileSync(req.file.path),
              contentType: req.file.mimetype,
            },
    });

    if (errors.length > 0) {
      res.render("categoryForm", {
        title: "Create New Category",
        category,
        errors,
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

exports.category_update_get = [
  param("id").isMongoId().withMessage("Invalid category id").escape(),

  function categoryUpdateGet(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("categoryForm", { title: "Update Category", errors });
    }
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
  },
];

exports.category_update_post = [
  upload.single("imageUpload"),
  body("name", "Category name required").trim().isLength({ min: 1 }).escape(),
  body("description", "Category description required")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  param("id").isMongoId().withMessage("Invalid category id").escape(),
  body("password")
    .custom((value) => {
      if (value !== process.env.ADMIN_PASSWORD) {
        throw new Error("Invalid password");
      }
      return true;
    })
    .escape(),

  (req, res, next) => {
    const { errors } = validationResult(req);

    // if our orderId from params is bad, handle before we try to fetch the order
    const paramErrors = errors.filter((error) => error.location === "params");
    if (paramErrors.length > 0) {
      return res.render("categoryForm", {
        title: "Update Category",
        errors,
      });
    }

    const category = new Category({
      name: req.body.name,
      description: req.body.description,
      image:
        req.file === undefined
          ? undefined
          : {
              data: fs.readFileSync(req.file.path),
              contentType: req.file.mimetype,
            },
      _id: req.params.id,
    });

    if (errors.length > 0) {
      return res.render("categoryForm", {
        title: `Update Category: ${req.body.name}`,
        category,
        errors,
      });
    }

    // no errors. update category and redirect.
    Category.findByIdAndUpdate(req.params.id, category).exec(
      (err, newCategory) => {
        if (err) {
          return next(err);
        }
        if (newCategory === null) {
          const notFoundError = new Error("Category not found");
          notFoundError.status = 404;
          return next(notFoundError);
        }
        return res.redirect(newCategory.url);
      }
    );
  },
];

exports.category_delete_get = [
  param("id").isMongoId().withMessage("Invalid category id").escape(),
  async function categoryDeleteGet(req, res, next) {
    try {
      const { errors } = validationResult(req);
      if (errors.length > 0) {
        return res.render("categoryDelete", {
          title: "Remove Category",
          errors,
        });
      }
      // Get category
      const category = await Category.findById(req.params.id)
        .populate("items")
        .exec();

      // If no category is found, redirect
      if (category === null) {
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
  },
];

exports.category_delete_post = [
  param("id").isMongoId().withMessage("Invalid category id").escape(),

  async function categoryDeletePost(req, res, next) {
    // handle validation error
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("categoryDelete", { title: "Remove Category", errors });
    }

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

    return res.redirect("/inventory/categories");
  },
];
