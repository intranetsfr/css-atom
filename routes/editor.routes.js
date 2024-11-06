const fs = require("fs");
module.exports = (app) => {
  const router = require("express").Router();
  const testFolder = "./saved/";
  router.get("/", (req, res) => {
    let data = {};
    data.title = "Editor";
    data.files = [];
    fs.readdir(testFolder, (err, files) => {
      files.forEach((file) => {
        console.log(file);
        data.files.push(file);
      });
    });
    res.render("editor/index", data);
  });
  router.post("/", (req, res) => {
    let data = {};
    data.title = "Editor";
    let filename = req.body.filename;

    const content = '<div class="root"></div>';
    fs.writeFile(`${testFolder}/${filename}.html`, content, (err) => {
      if (err) {
        console.error(err);
        res.redirect(`/editor/?error=${err}`);
      } else {
        // file written successfully
        res.redirect(`/editor/${filename}.html`);
      }
    });
  });
  router.get("/(:filename).html", (req, res) => {
    let data = {};
    data.title = req.params.filename;
    data.filename = `${data.title}.html`;
    res.render("editor/editor", data);
  });
  router.get("/render/:filename.html", (req, res) => {
    let data = {};
    data.title = "Editor";
    let filename = req.params.filename;
    data.filename = `${filename}.html`;
    res.render("editor/render", data);
  });
  router.get("/tree/:filename.html", (req, res) => {
    let data = {};
    data.title = "Editor";
    let filename = req.params.filename;
    data.filename = `${filename}.html`;
    res.render("editor/tree", data);
  });

  app.use("/editor", router);
};
