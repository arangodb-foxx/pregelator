'use strict';

// includes
const db = require('@arangodb').db;
const pregel = require("@arangodb/pregel");
let sgm = require("@arangodb/smart-graph");
const joi = require('joi');

// router
const createRouter = require('@arangodb/foxx/router');
const router = createRouter();
module.context.use(router);

// example algo
const vertexDegrees = require('./algos/exampleAlgorithm').vertexDegrees;

router.post('/start', function (req, res) {
  const name = req.body.name || "name";
  const graphName = req.body.graphName;
  const algorithm = req.body.algorithm;
  let pid = "";

  try {
    pid = pregel.start(
      "air",
      graphName,
      algorithm
    );
  } catch (e) {
    res.throw('bad request', e.message, {cause: e});
  }

  res.send({
    pid: pid
  });
})
  .body(
    joi.object().required(),
    'This implies JSON.'
  )
  .response(['application/json'], 'A generic greeting.')
  .summary('Generic greeting')
  .description('Prints a generic greeting.');

router.post('/resultDetails', function (req, res) {
  const graphName = req.body.graphName || "";
  const resultField = req.body.resultField || "";

  let finalResult = {};

  // get all vertex collections
  let vertexColls = sgm._graph(graphName)._vertexCollections();
  for (let [key, col] of Object.entries(vertexColls)) {
    let collectionName = col.name();
    finalResult[collectionName] = [];

    let res;
    if (resultField !== "") {
      res = db._query(
        'FOR doc IN @@vertexCollection LIMIT 5 RETURN doc[@resultField]',
        {
          '@vertexCollection': collectionName,
          'resultField': resultField
        }
      ).toArray();
    } else {
      res = db._query(
        'FOR doc IN @@vertexCollection LIMIT 5 RETURN doc',
        {
          '@vertexCollection': collectionName
        }
      ).toArray();
    }

    finalResult[collectionName].push(res);
  }
  ;

  res.send(finalResult);
})
  .body(
    joi.object().required(),
    'This implies JSON.'
  )
  .response(['application/json'], 'A generic greeting.')
  .summary('Generic greeting')
  .description('Prints a generic greeting.');

router.post('/status', function (req, res) {
  const pid = req.body.pid || "";
  let result = pregel.status(pid);
  res.send(result);
})
  .body(
    joi.object().required(),
    'This implies JSON.'
  )
  .response(['application/json'], 'A generic greeting.')
  .summary('Generic greeting')
  .description('Prints a generic greeting.');

router.get('/graphs', function (req, res) {
  res.send(sgm._list());
})
  .response(['application/json'], 'A generic greeting.')
  .summary('Generic greeting')
  .description('Prints a generic greeting.');

router.get('/userDefinedAlgorithms', function (req, res) {
  const qualifiedName = module.context.collectionName("userDefinedAlgorithms");
  let arr = db[qualifiedName].all().toArray();
  let result = {};
  arr.forEach(document => {
    result[document._key] = document;
  });

  // also push demo example
  result["dev_DemoVertexDegrees"] = {
    algorithm: vertexDegrees
  };

  res.send(result);
})
  .response(['application/json'], 'Map of algorithms. name => implementation')
  .summary('Get all stored algorithms')
  .description('Get all stored pregel algorithms. As a Map name => implementation.');


  router.put('/userDefinedAlgorithms/:name', function (req, res) {
    const qualifiedName = module.context.collectionName("userDefinedAlgorithms");
    const query = `INSERT {_key: @name, algorithm: @algorithm} INTO ${qualifiedName} OPTIONS { overwrite: true }`;
    const name = req.param("name");
    const algorithm = req.body;
    db._query(query, {name, algorithm});
    res.send(true);
  })
    .pathParam('name', joi.string().required())
    .body(joi.object().required(), "Alogrithm data")
    .response(['application/json'], 'Success Message')
    .summary('Save the given algorithm.')
    .description('Save the given algorithm');