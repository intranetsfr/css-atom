var createError = require('http-errors');
require("dotenv").config();
const express = require('express');
const cors = require("cors");

const logger = require('morgan');

const app = express();


app.use(cors({origin: ['http://localhost']}));

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();});
app.use(logger('dev'));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));


require("./routes/pages.routes")(app);

//twig
app.set('views', ['views']);
app.set('view engine', 'twig');
app.set("twig options", {
    allow_async: true, // Allow asynchronous compiling
    strict_variables: false
});
app.use(express.static('public'));
app.use(express.static('dist'));

module.exports = app;
