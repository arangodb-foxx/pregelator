import React, {useContext, useEffect, useState, useRef} from 'react';

import AceEditor from "react-ace";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools"
import "ace-builds/src-noconflict/mode-json";
import "./css/customList.css"

import {Box, Button, DataTable, Select, Text, Paragraph, List, TextInput} from "grommet/index";
import {get, post} from "axios";
import {toast} from "react-toastify";

import {usePregel} from "./PregelContext";
import {SmartGraphListContext} from "./SmartGraphListContext";
import {useUserDefinedAlgorithms, storeAlgorithm, selectAlgorithm} from "./UserDefinedAlgorithmsContext";
import {useExecution} from "./ExecutionContext";
import jwtControl from "./JWTControl";

const EditorActionsBar = (props) => (
  <Box
    direction='row'
    align='center'
    background='dark-1'
    pad={{left: 'small', right: 'small', vertical: 'small'}}
    elevation='medium'
    style={{zIndex: '1'}}
    {...props}
  />
);

let editorRef = React.createRef();
let outputEditorRef = React.createRef();
let previewEditorRef = React.createRef();

const notifyUser = function (msg) {
  toast(msg);
}

function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const SaveAs = ({editorRef}) => {
  const [saveAsName, setSaveAsName] = useState("");
  const [, dispatchUDF] = useUserDefinedAlgorithms();
  const saveAlgorithm = () => {
    dispatchUDF(storeAlgorithm(saveAsName, editorRef.current.editor.getValue()));
  };

  return (<>
    <Button
      primary
      label="Save&nbsp;as"
      margin={{left: 'small', right: 'small'}}
      onClick={saveAlgorithm}
    />
    <TextInput margin={{left: 'small'}} size="small" placeholder="AlgorithmName"
               onChange={e => setSaveAsName(e.target.value)} value={saveAsName}/>
  </>);
};

const JSONEditor = () => {
  useInterval(() => {
    // Update logic
    let checkState = (pregels) => {
      for (let [, pregel] of Object.entries(pregels)) {
        if (pregel.state === 'running' || pregel.state === 'storing') {
          get(
            process.env.REACT_APP_ARANGODB_COORDINATOR_BASE + process.env.REACT_APP_ARANGODB_CONTROL_PREGEL + '/' + pregel.pid,
            jwtControl.getAuthConfig()).then((response) => {
            if (response.data && response.data.state !== 'running' && response.data.state !== 'storing') {
              setPregels(prevPregels => {
                let updated = prevPregels;
                updated[pregel.pid].state = response.data.state;
                updated[pregel.pid].totalRuntime = response.data.totalRuntime.toFixed(5);
                return {...updated};
              });

              // auto update if changed to done
              fetchExecutionResult(pregel);
            }
          });
        }
      }

      // check output editor changes
      let outputCursorPosition = outputEditorRef.current.editor.getCursorPosition();
      let previewCursorPosition = previewEditorRef.current.editor.getCursorPosition();
      let outputVal = "";
      if (execution.summary) {
        outputVal = JSON.stringify(execution.summary, null, 2)
      }
      let previewVal = "";
      if (execution.preview) {
        previewVal = JSON.stringify(execution.preview, null, 2)
      }

      // only update if changed
      if (outputEditorRef.current.editor.getValue() !== outputVal) {
        outputEditorRef.current.editor.setValue(outputVal, outputCursorPosition);
      }
      if (previewEditorRef.current.editor.getValue() !== previewVal) {
        previewEditorRef.current.editor.setValue(previewVal, previewCursorPosition)
      }
    }

    checkState(pregels);
  }, 1000);

  let executeAlgorithm = async function () {
    try {
      let algorithm = editorRef.current.editor.getValue();

      //remove comments
      algorithm = algorithm.replace(/\s*\/\/.*\n/g, '\n').replace(/\s*\/\*[\s\S]*?\*\//g, '');
      algorithm = JSON.parse(algorithm);

      let resultField;
      if ('resultField' in algorithm) {
        resultField = algorithm.resultField;
      }

      if (!selectedGraph) {
        toast.error("No SmartGraph selected!");
        return;
      }

      const response = await post(
        process.env.REACT_APP_ARANGODB_COORDINATOR_BASE + process.env.REACT_APP_ARANGODB_CONTROL_PREGEL,
        {
          algorithm: "ppa",
          graphName: selectedGraph,
          params: algorithm
        },
        jwtControl.getAuthConfig());

      const pregelPid = response.data;

      setPregels(prevPregels => {
        let updated = prevPregels;
        updated[pregelPid] = {
          "pid": pregelPid,
          "totalRuntime": null,
          "resultField": resultField,
          "selectedGraph": selectedGraph,
          "state": "running"
        }
        return {...updated};
      });
      notifyUser("Pregel started, PID: " + pregelPid);
    } catch (error) {
      console.log(error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
        if (error.response.data) {
          let e = error.response.data;
          if (e.errorNum && e.errorMessage) {
            toast.error(`Error (${e.errorNum}): ${e.errorMessage}`);
          } else {
            toast.error(`Something unexpected happened. Please check logfiles.`);
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        toast.error(`Error: ${error.request}`);
      } else {
        // Something happened in setting up the request that triggered an Error
        toast.error(`Error: ${error.message}`);
      }
      console.log(error.config);
    }
  }

// global states
  const [graphs] = useContext(SmartGraphListContext);
  const [{selectedAlgorithm, userDefinedAlgorithms}, dispatchUDF] = useUserDefinedAlgorithms();
  const [pregels, setPregels] = usePregel();
  const [execution, setExecution] = useExecution();

// local state
  const [selectedGraph, setSelectedGraph] = useState(null);

  const setSelectedAlgorithm = (algo) => {
    dispatchUDF(selectAlgorithm(algo));
  }

  const replaceAlgorithm = () => {
    dispatchUDF(storeAlgorithm(selectedAlgorithm, editorRef.current.editor.getValue()));
  };

  // TODO: export function - copy & paste of RunningPregelList
  const fetchExecutionResult = (execution) => {
    toast(`Fetching status now of pid: ${execution.pid}`);

    get(
      process.env.REACT_APP_ARANGODB_COORDINATOR_BASE + process.env.REACT_APP_ARANGODB_CONTROL_PREGEL + '/' + execution.pid,
      jwtControl.getAuthConfig()).then((responseStatus) => {
      // only refetch state in case of status is not "running"
      if (responseStatus.data && (responseStatus.data.state !== 'running')) {
        post(
          process.env.REACT_APP_ARANGODB_COORDINATOR_URL + 'resultDetails',
          {
            graphName: execution.selectedGraph,
            resultField: execution.resultField
          },
          jwtControl.getAuthConfig()).then((responseDetails) => {
          if (responseDetails.data) {
            let reports = [];

            if (responseStatus.data.reports && responseStatus.data.reports.length >= 0) {
              for (let [, report] of Object.entries(responseStatus.data.reports)) {
                reports.push(report);
              }
              reports = responseStatus.data.reports;
              delete responseStatus.data.reports;
            }

            // State the output editor will be filled automatically
            let result = {
              summary: responseStatus.data,
              preview: responseDetails.data,
              reports: reports
            };
            result.summary.pid = execution.pid;

            setExecution(prevExecution => {
              return {...result};
            });
          }
        });
      }
    });
  };

  return (
    <Box direction="column" flex="grow" fill="horizontal">

      <EditorActionsBar>
        <Select
          options={Object.keys(userDefinedAlgorithms)}
          margin={{right: 'small'}}
          placeholder={'Select Algorithm'}
          //value={Object.keys(userDefinedAlgorithms)}
          onChange={({option}) => {
            let cursorPosition = outputEditorRef.current.editor.getCursorPosition();
            setSelectedAlgorithm(option);
            /*let getAlgorithm = function () {
              return userDefinedAlgorithms.hasOwnProperty(selectedAlgorithm)
                ? JSON.stringify(userDefinedAlgorithms[selectedAlgorithm].algorithm, null, 2)
                : "";
            }*/
            // const algo = getAlgorithm();
            get(process.env.REACT_APP_ARANGODB_COORDINATOR_URL + 'userDefinedAlgorithms/' + option, jwtControl.getAuthConfig())
              .then((res) => {
                console.log(res.data);
                if (res.data && res.data.algorithm) {
                  editorRef.current.editor.setValue(JSON.stringify(res.data.algorithm, null, 2), cursorPosition);
                }
              }, (error) => {
                toast.error(`This should only occur in dev mode if your foxx app is not deployed, ` + error);
              });
          }}
          value={selectedAlgorithm}
        />

        <Select
          options={graphs}
          placeholder={'Select SmartGraph'}
          value={selectedGraph}
          onChange={({option}) => {
            setSelectedGraph(option);
          }}
        />

        <Button
          primary
          label="Execute"
          margin={{left: 'small'}}
          onClick={executeAlgorithm}
        />

        <Button
          primary
          label="Save"
          margin={{left: 'small'}}
          onClick={replaceAlgorithm}
        />

        <SaveAs editorRef={editorRef}/>

      </EditorActionsBar>

      <Box direction='row' fill="vertical">
        <Box flex>
          <AceEditor ref={editorRef}
                     mode="json"
                     width={'full'}
                     height={'100%'}
                     theme="monokai"
                     commands={[
                       /*{
                         name: "executeAlgorithm",
                         bindKey: {win: "Ctrl-Enter", mac: "Command-Enter"},
                         exec: executeAlgorithm
                       }*/
                     ]
                     }
                     name="aceInputEditor"
                     setOptions={{useWorker: false}}
                     editorProps={{$blockScrolling: true}}
                     placeholder="Please select an algorithm"
          />
        </Box>

        <Box flex direction='column'>
          <Box flex direction='row' width={'full'} height="small">
            <Box basis={'1/2'} background='dark-1'>
              <Box background={'brand'}>
                <Text margin={'xsmall'} weight={'bold'}>Summary</Text>
              </Box>
              <AceEditor ref={outputEditorRef}
                         readOnly={true}
                         value={""}
                         mode="json"
                         width={'full'}
                         height={'100%'}
                         theme="monokai"
                         name="aceSummaryEditor"
                         setOptions={{useWorker: false}}
                         editorProps={{$blockScrolling: true}}
              />
            </Box>
            <Box basis={'1/2'} background='dark-1'>
              <Box background={'brand'}>
                <Text margin={'xsmall'} weight={'bold'}>Preview <Text weight={'normal'}>(result only filtered if
                  "resultField" is used)</Text></Text>
              </Box>
              <AceEditor ref={previewEditorRef}
                         value={""}
                         readOnly={true}
                         mode="json"
                         width={'full'}
                         height={'100%'}
                         theme="monokai"
                //onChange={{}}
                         name="aceSummaryEditor"
                         setOptions={{useWorker: false}}
                         editorProps={{$blockScrolling: true}}
              />
            </Box>
          </Box>
          <Box background={'brand'}>
            <Text margin={'xsmall'} weight={'bold'}>Reports</Text>
          </Box>
          <Box basis='2/3' overflow={"scroll"} background='dark-1'>
            <DataTable resizeable={false} size={"large"} alignSelf={"stretch"}
                       primaryKey={false} /*size={"full"}*/ /* TODO: Make DataTable height responsive*/
                       columns={[
                         {
                           property: 'msg',
                           header: 'Message',
                           size: 'medium',
                           render: datum => (
                             <Paragraph size={'small'}>
                               {datum.msg === "debug trace" ? datum.annotations.message || datum.msg : datum.msg}
                             </Paragraph>
                           )
                         },
                         {
                           property: "vertex",
                           header: "Vertex",
                           size: 'small',
                           render: datum => (
                             <Box>
                               <Text size={'small'}>{datum.annotations.vertex}</Text>
                             </Box>
                           )
                         },
                         {
                           property: "info",
                           header: "Info",
                           size: 'small',
                           render: datum => (
                             <List className={"smallList"}
                                   pad={'xxsmall'}
                                   primaryKey="name"
                                   secondaryKey="content"
                                   data={[
                                     {name: 'Level', content: datum.level},
                                     {name: 'Shard', content: datum.annotations["pregel-id"]?.shard},
                                     {
                                       name: 'Step / Superstep',
                                       content: (datum.annotations["phase-step"]) + " / " + (datum.annotations["global-superstep"])
                                     },
                                     {name: 'Phase', content: datum.annotations["phase"]},
                                     {name: 'Sender', content: datum.annotations.sender || ""}
                                   ]}
                             />
                           )
                         }
                       ]}
                       data={execution.reports || []}
            />
          </Box>

        </Box>
      </Box>
    </Box>
  )
}

export default JSONEditor;
