export const DEFAULT_INDEX_HTML = String.raw`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=yes" />
    <style>
      html {
        font-family: BlinkMacSystemFont,-apple-system,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",Helvetica,Arial,sans-serif;
        -webkit-font-smoothing: antialiased;
        background-color: #fff;
        font-size: 16px;
      }
      body {
        color: #4a4a4a;
        margin: 8px;
        font-size: 1em;
        font-weight: 400;
      }
      header {
        margin-bottom: 8px;
        display: flex;
        flex-direction: column;
      }
      main {
        width: 100%;
        display: flex;
        flex-direction: column;
      }
      a {
        color: #3273dc;
        cursor: pointer;
        text-decoration: none;
      }
      a:hover {
        color: #000;
      }
      button {
        color: #fff;
        background-color: #3298dc;
        border-color: transparent;
        cursor: pointer;
        text-align: center;
      }
      button:hover {
        background-color: #2793da;
        flex: none;
      }
      .spacer {
        flex: auto;
      }
      .small {
        font-size: 0.75rem;
      }
      footer {
        margin-top: 16px;
        display: flex;
        align-items: center;
      }
      .header-label {
        margin-right: 4px;
      }
      .benchmark-set {
        margin: 8px 0;
        width: 100%;
        display: flex;
        flex-direction: column;
      }
      .benchmark-title {
        font-size: 3rem;
        font-weight: 600;
        word-break: break-word;
        text-align: center;
      }
      .benchmark-graphs {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        align-items: center;
        flex-wrap: wrap;
        width: 100%;
      }
      .benchmark-wrapper {
        max-width: 1000px;
        flex-grow: 1;
        flex-basis: 0;
      }
      .benchmark-container {
        position: relative;
      }
      .benchmark-chart {
      }
      .benchmark-name {
        text-align: center;
      }
    </style>
    <title>Benchmarks</title>
  </head>

  <body>
    <header id="header">
      <div class="header-item">
        <strong class="header-label">Last Update:</strong>
        <span id="last-update"></span>
      </div>
      <div class="header-item">
        <strong class="header-label">Repository:</strong>
        <a id="repository-link" rel="noopener"></a>
      </div>
    </header>
    <main id="main"></main>
    <footer>
      <button id="dl-button">Download data as JSON</button>
      <div class="spacer"></div>
      <div class="small">Powered by <a rel="noopener" href="https://github.com/marketplace/actions/continuous-benchmark">github-action-benchmark</a></div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/chart.js@2.9.2/dist/Chart.min.js"></script>
    <script src="data.js"></script>
    <script id="main-script">
      'use strict';
      (function() {
        // Colors from https://github.com/github/linguist/blob/master/lib/linguist/languages.yml
        const toolColors = {
          cargo: '#dea584',
          go: '#00add8',
          benchmarkjs: '#f1e05a',
          benchmarkluau: '#000080',
          pytest: '#3572a5',
          googlecpp: '#f34b7d',
          catch2: '#f34b7d',
          julia: '#a270ba',
          jmh: '#b07219',
          benchmarkdotnet: '#178600',
          customBiggerIsBetter: '#38ff38',
          customSmallerIsBetter: '#ff3838',
          _: '#333333'
        };

        function init() {
          function collectBenchesPerTestCase(entries) {
            const map = new Map(); // Map BenchName (Map SeriesName (Map Commit BenchResult))
            const commits = [];
            for (const entry of entries) {
              const {commit, date, tool, benches} = entry;
              commits.push(commit.id);
              for (const series_name in benches) { // Map SeriesName [Benchmark]
                for (const bench of benches[series_name]) {
                  const result = { commit, date, tool, bench };
                  const series_map = map.get(bench.name);
                  if (series_map === undefined) {
                    const bench_map = new Map();
                    bench_map.set(commit.id, result);

                    const series_map = new Map();
                    series_map.set(series_name, bench_map);

                    map.set(bench.name, series_map);
                  } else {
                    const arr = series_map.get(series_name);
                    if (arr === undefined) {
                      const bench_map = new Map();
                      bench_map.set(commit.id, result);

                      series_map.set(series_name, bench_map);
                    } else {
                      arr.set(commit.id, result);
                    }
                  }
                }
              }
            }
            return { commits, dataSet: map };
          }

          const data = window.BENCHMARK_DATA;

          // Render header
          document.getElementById('last-update').textContent = new Date(data.lastUpdate).toString();
          const repoLink = document.getElementById('repository-link');
          repoLink.href = data.repoUrl;
          repoLink.textContent = data.repoUrl;

          // Render footer
          document.getElementById('dl-button').onclick = () => {
            const dataUrl = 'data:,' + encodeURIComponent(JSON.stringify(data, null, 2));
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'benchmark_data.json';
            a.click();
          };

          // Prepare data points for charts
          return Object.keys(data.entries).map(name => {
              const { commits, dataSet } = collectBenchesPerTestCase(data.entries[name]);
              return {
                 name,
                 commits,
                 dataSet
               };
          });
        }

        function renderAllChars(dataSets) {

          function renderGraph(parent, commits, name, dataset) {
            const wrapper = document.createElement('div');
            wrapper.className = 'benchmark-wrapper';
            const header = document.createElement('h2');
            header.className = 'benchmark-name';
            header.innerText = name;
            wrapper.appendChild(header);

            const canvas_container = document.createElement('div');
            canvas_container.className = 'benchmark-container';

            const canvas = document.createElement('canvas');
            canvas.className = 'benchmark-chart';
            canvas_container.appendChild(canvas);
            wrapper.appendChild(canvas_container);
            parent.appendChild(wrapper);

            const colors = Object.entries(toolColors).values();
            const datasets = [];
            for (const [series_name, data] of dataset) {
              const color = colors.next().value[1];
              datasets.push({
                label: series_name,
                data: commits.map(commit => data.get(commit).bench.value),
                borderColor: color,
                fill: false,
                backgroundColor: color + '60', // Add alpha for #rrggbbaa
              });
            }
            const data = {
              labels: commits.map(c => c.slice(0, 7)),
              datasets: datasets,
            };
            const options = {
              scales: {
                xAxes: [
                  {
                    scaleLabel: {
                      display: true,
                      labelString: 'commit',
                    },
                  }
                ],
                yAxes: [
                  {
                    scaleLabel: {
                      display: true,
                      labelString: dataset.length > 0 ? dataset[0].bench.unit : '',
                    },
                    ticks: {
                      beginAtZero: true,
                    }
                  }
                ],
              },
              tooltips: {
                callbacks: {
                  afterTitle: items => {
                    const {datasetIndex, index} = items[0];
                    const series_name = datasets[datasetIndex].label;
                    const commit = commits[index];
                    const data = dataset.get(series_name).get(commit);
                    return '\n' + data.commit.message + '\n\n' + data.commit.timestamp + ' committed by @' + data.commit.committer.username + '\n';
                  },
                  label: item => {
                    const series_name = datasets[item.datasetIndex].label;
                    const commit = commits[item.index];
                    const data = dataset.get(series_name).get(commit);
                    let label = item.value;
                    const { range, unit } = data.bench;
                    label += ' ' + unit;
                    if (range) {
                      label += ' (' + range + ')';
                    }
                    return label;
                  },
                  afterLabel: item => {
                    const series_name = datasets[item.datasetIndex].label;
                    const commit = commits[item.index];
                    const data = dataset.get(series_name).get(commit);
                    const { extra } = data.bench;
                    return extra ? '\n' + extra : '';
                  }
                }
              },
              onClick: (_mouseEvent, activeElems) => {
                if (activeElems.length === 0) {
                  return;
                }
                // XXX: Undocumented. How can we know the index?
                const index = activeElems[0]._index;
                const url = dataset[index].commit.url;
                window.open(url, '_blank');
              },
            };

            new Chart(canvas, {
              type: 'line',
              data,
              options,
            });
          }

          function renderBenchSet(name, commits, benchSet, main) {
            const setElem = document.createElement('div');
            setElem.className = 'benchmark-set';
            main.appendChild(setElem);

            const nameElem = document.createElement('h1');
            nameElem.className = 'benchmark-title';
            nameElem.textContent = name;
            setElem.appendChild(nameElem);

            const graphsElem = document.createElement('div');
            graphsElem.className = 'benchmark-graphs';
            setElem.appendChild(graphsElem);

            for (const [benchName, benches] of benchSet.entries()) {
              renderGraph(graphsElem, commits, benchName, benches)
            }
          }

          const main = document.getElementById('main');
          for (const {name, commits, dataSet} of dataSets) {
            renderBenchSet(name, commits, dataSet, main);
          }
        }

        renderAllChars(init()); // Start
      })();
    </script>
  </body>
</html>
`;
