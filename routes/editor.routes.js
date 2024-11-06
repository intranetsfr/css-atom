const fs = require("fs");
const htmlparser2 = require("htmlparser2");

const { JSDOM } = require("jsdom");
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

    fs.readFile(`${testFolder}${data.filename}`, "utf8", (err, contentFile) => {
      if (err) {
        console.error(err);
        data.error = err;
        res.render("editor/render", data);
        return;
      }
      data.contentFile = contentFile;
      res.render("editor/render", data);
    });
  });

  router.get("/tree/:filename.html", (req, res) => {
    let data = {};
    data.title = "Editor";
    let filename = req.params.filename;
    data.filename = `${filename}.html`;

    fs.readFile(`${testFolder}${data.filename}`, "utf8", (err, contentFile) => {
      if (err) {
        console.error(err);
        data.error = err;
        res.render("editor/render", data);
        return;
      }

      // Fonction récursive pour construire l'arbre des éléments
      function parseNode(node) {
        if (node.type === "tag") {
          const parsedNode = {
            tag: node.name,
            class: node.attribs.class ? node.attribs.class.split(" ") : [],
            children: [],
          };

          if (node.children) {
            parsedNode.children = node.children
              .map(parseNode)
              .filter((child) => child); // Exclure les éléments `null`
          }
          return parsedNode;
        }
        return null; // Ignorer les autres types de nœuds (comme texte brut)
      }

      // Analyse du contenu HTML et création de l'arborescence
      const dom = htmlparser2.parseDocument(contentFile).children;
      const tree = dom.map(parseNode).filter((node) => node); // Filtrer les `null`

      // Assigner l'arborescence au champ data et l'envoyer à la vue
      data.tree = tree;
      res.render("editor/tree", data);
    });
  });

  router.get("/proprety/:filename.html", (req, res) => {
    let data = {};
    data.title = "Editor";

    const filename = req.params.filename;
    data.tagIndex = parseInt(req.query.tagIndex, 10);
    data.level = parseInt(req.query.level, 10);
    const filepath = `${testFolder}/${filename}.html`;

    // Lecture du fichier HTML
    fs.readFile(filepath, "utf8", (err, html) => {
      if (err) {
        console.error(err);
        data.error = "Erreur lors de la lecture du fichier.";
        res.render("editor/proprety", data);
        return;
      }

      // Manipuler le DOM du fichier HTML avec jsdom
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Fonction de recherche de l'élément par tagIndex et level
      function findElementByIndexAndLevel(
        root,
        tagIndex,
        level,
        currentLevel = -1,
        currentIndex = { value: -1 }
      ) {
        if (currentLevel === level) {
          currentIndex.value++;
          if (currentIndex.value === tagIndex) {
            return root;
          }
        }

        for (let child of root.children) {
          const found = findElementByIndexAndLevel(
            child,
            tagIndex,
            level,
            currentLevel + 1,
            currentIndex
          );
          if (found) {
            return found;
          }
        }
        return null;
      }

      // Démarrer la recherche à partir de `<body>`
      const element = findElementByIndexAndLevel(
        document.body,
        data.tagIndex,
        data.level
      );

      if (element) {
        // Extraire les informations nécessaires
        data.tagName = element.tagName.toLowerCase();
        data.classes = Array.from(element.classList);
      } else {
        data.error = "Élément non trouvé.";
      }

      res.render("editor/proprety", data);
    });
  });

  router.post("/proprety/:filename.html", (req, res) => {
    res.send({result: req.body})
  })
  app.use("/editor", router);
};
