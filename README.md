# Coffee Shop Inventory Application

> An inventory management website for a coffee shop. Handles items, item categories, stock, orders, and inventory counts.

Visit this site live at https://corcovadocafe.herokuapp.com/

## Table of Contents

1. [Technology Stack](#techology-stack)
1. [About](#about)
   1. [Over and Above](#over-and-above)
   1. [Async](#async)
   1. [Bootstrap](#bootstrap)
   1. [Possible Improvements](#possible-improvements)

## Technology Stack

[![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=fff)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/-Express-000000?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/-MongoDB-153814?logo=mongodb)](https://www.mongodb.org/)
[![Mongoose](https://img.shields.io/static/v1?label=m&message=Mongoose&color=880000&labelColor=eee)](https://mongoosejs.com/)
[![Pug](https://img.shields.io/badge/-Pug-A86454?logo=pug&logoColor=421b11)](https://pugjs.org/)
[![MDBootstrap](https://img.shields.io/badge/-MDBootstrap-7952B3?logo=bootstrap&logoColor=fff)](https://mdbootstrap.com/)
[![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Babel](https://img.shields.io/badge/-Babel-030301?logo=babel)](https://babeljs.io/)
[![ESLint](https://img.shields.io/badge/-ESLint-4B32C3?logo=eslint)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/-Prettier-24292e?logo=prettier)](https://prettier.io/)
[![npm](https://img.shields.io/badge/-npm-CB3837?logo=npm)](https://www.npmjs.com/)

## About

This server-side website was made as a project to learn Express & MongoDB with Mongoose. The idea for this project came from [The Odin Project](https://www.theodinproject.com/courses/nodejs/lessons/inventory-application).

### Over and Above

The project as suggested tracks only item categories and items, with quantities in stock. Drawing on my experience working for a major coffee chain, I sought to implement many facets of a real-world inventory management system. In addition to item categories and items, the app allows users to place orders, receive orders, receive product ad hoc, and complete inventory counts. This introduced significantly greater complexity.

For instance, receiving an order involves

1. Pulling an existing order with its items,
1. Ensuring the order is not already received,
1. Pulling all items and allowing the user to adjust the items being received,
1. Accepting the user input, validating, sanitizing, and filtering out items not in the receipt,
1. Creating the receipt,
1. Amending the order with received status and delivery date,
1. Updating all received items with their new quantities in stock, and
1. Handling all possible errors throughout the process.

### Async

I used this as an opportunity to grow in comfort with the various ways of handling asynchronous code in JavaScript, using callbacks, promises, async/await, and the async library commonly used in legacy code.

In a real-world application we would want consistency, but for learning purporses, I intentionally mixed up my strategy for handling asynchronous code and left the differences in the code. In the course of writing the app, I went from finding callbacks unintuitive and promises foreign to using each fluently.

The app gave occasion for writing asynchronous code that takes full advantage of JavaScript's event-driven, non-blocking capabilities, using Promise.all and the async library's `waterfall` and `auto` methods to let database processes run simultaneously.

### Bootstrap

### Possible Improvements

There are many ways this could be improved, a few of which I began to list in the pagesDesired file. The code's readability and consistency could also be improved, including but not limited to changing to a consistent handling of asynchronous code. I have chosen to leave some as is, as it served as a useful exercise, but I may go back and clean things up at some point. A number of functions could be factored out to make the code more DRY.
