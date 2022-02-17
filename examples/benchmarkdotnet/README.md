C# example for benchmarking with `Benchmark.Net`
================================================

- [Workflow for this example](../../.github/workflows/benchmarkdotnet.yml)
- [Action log of this example](https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Benchmark.Net+example%22)
- [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/rhysd/github-action-benchmark)
with [`Benchmark.Net`](https://benchmarkdotnet.org/).

## Run benchmarks

Official documentation for usage of `Benchmark.Net`:

https://benchmarkdotnet.org/articles/overview.html

You should add the `Benchmark.Net` package to your test project and configure your tests according to the [Getting Started](https://benchmarkdotnet.org/articles/guides/getting-started.html) docs. A simple test file might look like


```csharp
using System;
using System.Security.Cryptography;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

namespace MyBenchmarks
{
    [JsonExporterAttribute.Full]
    [JsonExporterAttribute.FullCompressed]
    public class Md5VsSha256
    {
        private const int N = 10000;
        private readonly byte[] data;

        private readonly SHA256 sha256 = SHA256.Create();
        private readonly MD5 md5 = MD5.Create();

        public Md5VsSha256()
        {
            data = new byte[N];
            new Random(42).NextBytes(data);
        }

        [Benchmark]
        public byte[] Sha256() => sha256.ComputeHash(data);

        [Benchmark]
        public byte[] Md5() => md5.ComputeHash(data);
    }

    public class Program
    {
        public static void Main(string[] args)
        {
            var summary = BenchmarkRunner.Run<Md5VsSha256>();
        }
    }
}
```

You can then run the tests using `dotnet run`.  It's _very_ important that you ensure the JSON exporter is configured. You can do this by adding at least one of the exporter attributes in the example above, or by using the `BenchmarkSwitcher` type to run your tests, passing in your `args`, and using `--exporters json` from the command line.

## Process benchmark results

Store the benchmark results with step using the action. Please set `benchmarkdotnet` to `tool` input.

By default, Benchmark.Net will output results files to the current directory in a structure like:

```
BenchmarkDotNet.Artifacts
├── Sample.Benchmarks-20200529-153703.log
├── Sample.Benchmarks-20200529-153729.log
└── results
    ├── Sample.Benchmarks-report-full-compressed.json
    ├── Sample.Benchmarks-report-github.md
    ├── Sample.Benchmarks-report.csv
    └── Sample.Benchmarks-report.html
```

You want to get the path of the `-report-full-compressed.json` report for use with this action.  Once you have both pieces of data, use the action like so, replacing the output file path with your own path.

```yaml
- name: Store benchmark result
  uses: rhysd/github-action-benchmark@v1
  with:
    tool: 'benchmarkdotnet'
    output-file-path: BenchmarkDotNet.Artifacts/results/Sample.Benchmarks-report-full-compressed.json
```

Please read ['How to use' section](https://github.com/rhysd/github-action-benchmark#how-to-use) for common usage.
