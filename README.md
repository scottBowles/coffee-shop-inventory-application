# Coffee Shop Inventory Application

> An inventory management website for a coffee shop. Handles items, item categories, stock, orders, and inventory counts.

Visit this site live at https://corcovadocafe.herokuapp.com/

## Table of Contents

1. [Technology Stack](#techology-stack)
1. [Project Scope: Exceeding Expectations](#project-scope)
1. [Async](#async)
1. [Bootstrap + DataTables](#bootstrap)
1. [Possible Improvements](#possible-improvements)
1. [Local Installation](#local-installation)

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

## Project Scope: Exceeding Expectations

This server-side website was made as a project to learn Express & MongoDB with Mongoose.

The idea for this project came from [The Odin Project](https://www.theodinproject.com/courses/nodejs/lessons/inventory-application). The project as suggested tracks only item categories and items, with quantities in stock. Drawing on my experience working for a major coffee chain, I sought to implement many facets of a real-world inventory management system. In addition to item categories and items, the app allows users to place orders, receive orders, receive product ad hoc, and complete inventory counts. This introduced significantly greater complexity.

For instance, receiving an order involves:

1. Pulling an existing order with its items,
1. Ensuring the order is not already received,
1. Pulling all items and allowing the user to adjust the items being received,
1. Accepting the user input, validating, sanitizing, and filtering out items not in the receipt,
1. Creating the receipt,
1. Amending the order with received status and delivery date,
1. Updating all received items with their new quantities in stock, and
1. Handling all possible errors throughout the process.

## Async

I used this as an opportunity to grow in comfort with JavaScript's various ways of handling asynchronous code, using callbacks, promises, async/await, and the async library common in legacy code.

In a real-world application we would want consistency, but for learning purposes, I intentionally mixed up my strategy for handling asynchronous code and left the differences in place. In the course of writing the app, I went from finding callbacks unintuitive and promises foreign to using each fluently.

The app gave occasion for writing asynchronous code that takes full advantage of JavaScript's event-driven, non-blocking capabilities, using Promise.all and the async library's `waterfall` and `auto` methods to let database processes run simultaneously.

## Bootstrap + DataTables

While making this app I was focused on the backend but also interested in learning Bootstrap. The relative ease of adding Bootstrap and learning the basics made these goals align nicely. Better yet, Bootstrap DataTables proved a great fit for displaying data and getting sort and search functionality for free, so to speak.

## Possible Improvements

As mentioned above, choosing a unified strategy for handling asynchronous code would improve readability. The current inconsistency is only there to show my process in understanding a variety of common strategies.

A number of functions could be factored out to DRY up the code.

We could make it so that, if the user hits enter after entering a password, the app performs the action which lead to the password. That is, if a user clicks a `save` button and is then asked to enter a password, hitting enter should save rather than submit, though both buttons remain present.

Authorization and authentication could be added, enabling multiple users and multiple roles. For instance, we may want to allow store employees to create orders and inventory counts, but not allow them to add new items or categories. Or we may want to track who has performed what actions. This would also obviate the need for password entering for at least common non-destructive actions.

## Local Installation

### Requirements

- [Node.js with npm](https://nodejs.org/en/)
- [MongoDB](https://www.mongodb.com/cloud/atlas)
- [Git](https://git-scm.com/)

### Instructions

1. Clone this repository and change directory into the folder

   - Using SSH

     ```bash
     git clone git@github.com:scottBowles/coffee-shop-inventory-application.git
     cd coffee-shop-inventory-application
     ```

   - Using https

     ```bash
     git clone https://github.com/scottBowles/coffee-shop-inventory-application.git
     cd coffee-shop-inventory-application
     ```

1. Install dependencies

   `npm i`

1. Configure environment variables

   Create a filed named `.env` in the /coffee-shop-inventory-application directory with environment variables. For this you will need to set up your MongoDB database and retrieve the connection URIs. The URI will look something like this: `mongodb+srv://[username]:[password]@cluster0.g79of.mongodb.net/[database_name]?retryWrites=true&w=majority`. You will also create an admin password, to be used any time the app requires a password to make a change.

   Variables are defined in the format `key=value`, with no quotation marks. The file's contents should look like the following:

   ```
   DB_URI={MongoDB Connection URI}
   ADMIN_PASSWORD={passwordOfYourChoosing}
   ```

1. Optionally, you can populate the database with some premade data

   `node populatedb '<your mongodb uri>'`

1. Start the local server

   `npm run serverstart`

1. And the site should be available!

   `http://localhost:3000/`
