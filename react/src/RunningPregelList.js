import React, {useContext} from 'react';
import {
  Heading,
  Box,
  DataTable,
  Text
} from 'grommet';

import {PregelContext} from './PregelContext';
import {useExecution} from "./ExecutionContext";
import {post} from "axios";
import {toast} from "react-toastify";
import {Button} from "grommet/index";

const getRunning = (pregels) => {
  return Object.values(pregels).filter(p => p.state === 'running' || p.state === 'storing');
};

const getDone = (pregels) => {
  return Object.values(pregels).filter(p => p.state === 'done');
};

const getOther = (pregels) => {
  return Object.values(pregels).filter(p => p.state !== 'done' && p.state !== 'running' && p.state !== 'storing');
};

const RunningPregelList = () => {
  const [, setExecution] = useExecution();
  const [pregels, setPregels] = useContext(PregelContext);

  const fetchExecutionResult = (execution) => {
    toast(`Fetching status now of pid: ${execution.pid}`);

    post(
      process.env.REACT_APP_ARANGODB_COORDINATOR_URL + 'status',
      {
        pid: execution.pid
      },
      {
        headers:
          {'Content-Type': 'application/json'}
      }).then((responseStatus) => {
      if (responseStatus.data && responseStatus.data.state === 'done') {
        post(
          process.env.REACT_APP_ARANGODB_COORDINATOR_URL + 'resultDetails',
          {
            graphName: execution.selectedGraph,
            resultField: execution.resultField
          },
          {
            headers:
              {'Content-Type': 'application/json'}
          }).then((responseDetails) => {
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

  let clearPids = async function () {
    setPregels({});
  }

  const donePs = getDone(pregels);
  const otherPs = getOther(pregels);
  const runningPs = getRunning(pregels);


  return (
    <div>
      <Box width={'full'}>
        <Button
          primary
          label="Clear"
          alignSelf={'end'}
          onClick={clearPids}
        />
      </Box>

      <Heading level="3">Running ({runningPs.length})</Heading>

      <Box>
        {runningPs.length === 0 &&
        <Text>No pregel algorithm started yet.</Text>
        }
        {runningPs.length > 0 &&
        <DataTable
          columns={[
            {
              property: 'pid',
              header: <Text>ID</Text>,
              primary: true,
            },
            {
              property: 'percent',
              header: 'Result field',
              render: datum => (
                <Box>
                  <Text>{datum.resultField}</Text>
                </Box>

              )
            },
          ]}
          data={runningPs}
        />
        }

      </Box>

      <Heading level="3">Done ({donePs.length})</Heading>
      <Box>
        {donePs.length === 0 &&
        <Text>No pregel algorithm finished yet.</Text>
        }
        {donePs.length > 0 &&

        <DataTable
          columns={[
            {
              property: 'pid',
              header: <Text>ID</Text>
            },
            {
              property: 'percent',
              header: 'Execution time',
              render: datum => (
                <Box>
                  <Text>{datum.totalRuntime}</Text>
                </Box>

              )
            },
          ]}
          onClickRow={(datum) => {
            fetchExecutionResult(datum.datum);
          }}
          data={donePs}
        />

        }
      </Box>

      <Heading level="3">Errored ({otherPs.length})</Heading>
      <Box>
        {otherPs.length === 0 &&
        <Text>No pregel algorithm errored yet.</Text>
        }
        {otherPs.length > 0 &&

        <DataTable
          columns={[
            {
              property: 'pid',
              header: <Text>ID</Text>
            },
            {
              property: 'percent',
              header: 'Execution time',
              render: datum => (
                <Box>
                  <Text>{datum.totalRuntime}</Text>
                </Box>

              )
            },
          ]}
          onClickRow={(datum) => {
            fetchExecutionResult(datum.datum);
          }}
          data={otherPs}
        />

        }
      </Box>

    </div>
  );
}

export default RunningPregelList;