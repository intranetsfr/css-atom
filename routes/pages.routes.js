module.exports = app => {
    const router = require("express").Router();
    router.get('/', (req, res)=>{
        let data = {};
        data.title = "Home";
        res.render('pages/index', data);
    });
    
    app.use('/', router);
};