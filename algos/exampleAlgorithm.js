const resultField = "resultField";
const dampingFactor = 0.85;

const vertexDegrees = {
  "dataAccess": {
    "writeVertex": [
      "attrib-set", ["attrib-set", ["dict"], "inDegree", ["accum-ref", "inDegree"]],
      "outDegree", ["accum-ref", "outDegree"]
    ]
  },
  "maxGSS": 2,
  "vertexAccumulators": {
    "outDegree": {
      "accumulatorType": "store",
      "valueType": "int"
    },
    "inDegree": {
      "accumulatorType": "sum",
      "valueType": "int"
    }
  },
  "phases": [{
    "name": "main",
    "initProgram": ["seq",
      // Set our out degree
      ["accum-set!", "outDegree", ["this-outbound-edges-count"]],
      // Init in degree to 0
      ["accum-set!", "inDegree", 0],
      ["send-to-all-neighbours", "inDegree", 1]
    ],
    // Update program has to run once to accumulate the
    // inDegrees that have been sent out in initProgram
    "updateProgram": ["seq",
      false]
  }]
};

module.exports.vertexDegrees = vertexDegrees;
