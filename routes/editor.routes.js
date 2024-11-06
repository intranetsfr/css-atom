const fs = require("fs");
const htmlparser2 = require("htmlparser2");
const { JSDOM } = require("jsdom");
module.exports = (app) => {
  const router = require("express").Router();
  const testFolder = "./saved/";

  function findNodeByIndexAndLevel(
    nodes,
    targetIndex,
    targetLevel,
    currentLevel = 0
  ) {
    if (currentLevel === targetLevel) {
      return nodes[targetIndex];
    }
    for (const node of nodes) {
      if (node.children) {
        const foundNode = findNodeByIndexAndLevel(
          node.children,
          targetIndex,
          targetLevel,
          currentLevel + 1
        );
        if (foundNode) return foundNode;
      }
    }
    return null;
  }

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
  function findParentNode(tree, targetNode) {
    function recursiveSearch(nodes, parent = null) {
        for (const node of nodes) {
            if (node.nodeRef === targetNode.nodeRef.parent) {
                return parent; // On renvoie le parent correspondant dans l’arborescence
            }
            if (node.children && node.children.length > 0) {
                const result = recursiveSearch(node.children, node);
                if (result) return result;
            }
        }
        return null;
    }

    return recursiveSearch(tree);
}
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
    const { tagIndex, level, action } = req.query; // Extraction des paramètres de requête
    const filePath = `${testFolder}${data.filename}`;

    fs.readFile(filePath, "utf8", (err, contentFile) => {
      if (err) {
        console.error(err);
        data.error = err;
        res.render("editor/render", data);
        return;
      }
      function parseNode(node) {
        if (node.type === "tag") {
          const parsedNode = {
            tag: node.name,
            class: node.attribs.class ? node.attribs.class.split(" ") : [],
            children: [],
            nodeRef: node, // Référence vers le nœud original pour les modifications
          };

          if (node.children) {
            parsedNode.children = node.children
              .map(parseNode)
              .filter((child) => child); // Exclure les éléments `null`
          }
          return parsedNode;
        }
        return null;
      }

      const dom = htmlparser2.parseDocument(contentFile).children;
      const tree = dom.map(parseNode).filter((node) => node); // Filtrer les `null`

      // Vérifier si on doit ajouter un élément
      if (action === "add" && tagIndex !== undefined && level !== undefined) {
        const targetNode = findNodeByIndexAndLevel(
          tree,
          parseInt(tagIndex, 10),
          parseInt(level, 10)
        );

        if (targetNode) {
          const newDiv = {
            type: "tag",
            name: "div",
            attribs: { class: "" },
            children: [],
          };

          targetNode.nodeRef.children.push(newDiv);

          const updatedHTML = dom
            .map((node) => htmlparser2.DomUtils.getOuterHTML(node))
            .join("");

          fs.writeFile(filePath, updatedHTML, "utf8", (writeErr) => {
            if (writeErr) {
              console.error(writeErr);
              return res
                .status(500)
                .send("Erreur lors de l'écriture du fichier");
            }
            data.tree = tree;
            res.redirect(
              `/editor/tree/${filename}.html?tagIndex=${tagIndex}&level=${level}`
            );
          });
        } else {
          res.status(404).send("Conteneur cible introuvable");
        }
      } else if (action === "copy" && tagIndex !== undefined && level !== undefined) {
        const targetNode = findNodeByIndexAndLevel(
            tree,
            parseInt(tagIndex, 10),
            parseInt(level, 10)
        );
    
        console.log("Target Node:", targetNode); // Diagnostic
    
        if (targetNode) {
            const parentNode = findParentNode(tree, targetNode);
    
            if (parentNode) {
                const newElement = {
                    type: "tag",
                    name: targetNode.nodeRef.name,
                    attribs: { ...targetNode.nodeRef.attribs },
                    children: [],
                };
    
                parentNode.nodeRef.children.push(newElement);
    
                const updatedHTML = dom
                    .map((node) => htmlparser2.DomUtils.getOuterHTML(node))
                    .join("");
    
                fs.writeFile(filePath, updatedHTML, "utf8", (writeErr) => {
                    if (writeErr) {
                        console.error(writeErr);
                        return res.status(500).send("Erreur lors de l'écriture du fichier");
                    }
                    res.redirect(`/editor/tree/${filename}.html?tagIndex=${tagIndex}&level=${level}`);
                });
            } else {
                console.error("Parent introuvable pour le nœud cible:", targetNode); // Diagnostic
                res.status(404).send("Parent introuvable");
            }
        } else {
            res.status(404).send("Conteneur cible introuvable");
        }
    } else {
        data.tree = tree;
        res.render("editor/tree", data);
    }
    });
  });

  router.get("/proprety/:filename.html", (req, res) => {
    let data = {};
    data.title = "Proprety";

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
      data.update = req.query.update;
      res.render("editor/proprety", data);
    });
  });

  router.post("/proprety/:filename.html", (req, res) => {
    const filename = req.params.filename;
    const tagIndex = parseInt(req.query.tagIndex, 10);
    const level = parseInt(req.query.level, 10);
    const newTag = req.body.tag; // Nouveau tag choisi
    const newClasses = req.body.classes || []; // Nouvelles classes envoyées par le formulaire
    const filepath = `${testFolder}${filename}.html`;

    // Lire le fichier HTML
    fs.readFile(filepath, "utf8", (err, html) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Erreur de lecture du fichier");
      }
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const element = findElementByIndexAndLevel(
        document.body,
        tagIndex,
        level
      );
      if (element) {
        const newElement = document.createElement(newTag);
        newElement.innerHTML = element.innerHTML;

        newElement.className = newClasses.join(" ");
        element.replaceWith(newElement);

        const updatedHTML = document.body.innerHTML;
        fs.writeFile(filepath, updatedHTML, "utf8", (writeErr) => {
          if (writeErr) {
            console.error(writeErr);
            return res.status(500).send("Erreur lors de l'écriture du fichier");
          }
          res.redirect(
            `/editor/proprety/${filename}.html?tagIndex=${tagIndex}&level=${level}&update=true`
          );
        });
      } else {
        res.status(404).send("Élément non trouvé");
      }
    });
  });
  app.use("/editor", router);
};
