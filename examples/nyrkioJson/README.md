# Nyrkiö JSON as sent to the nyrkio.com API

This is a simple pass through alternative. You can write your benchmark results directly in the
JSON format accepted by the nyrkio.com API. (See https://nyrkio.com/openapi for details).

In this case, output-file-path should be a directory with one or more JSON files.
The contents of each file is posted as is to: https://nyrkio.com/api/v0/result/[filename]

Note that the benchmark-results/benchmark1 file is exactly the same as the tutorial at
https://nyrkio.com/docs/getting-started

## Example configuration

```yaml
- name: Analyze benchmark results with Nyrkiö
  uses: nyrkio/change-detection@v2
  with:
    tool: 'nyrkioJson'
    # Note that for 'nyrkioJson' you should supply a directory that contains 1 or more JSON files.
    output-file-path: examples/nyrkioJson/benchmark-results
    nyrkio-token: ${{ secrets.NYRKIO_JWT_TOKEN }}
```
