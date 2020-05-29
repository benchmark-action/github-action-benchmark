using System;
using BenchmarkDotNet;
using BenchmarkDotNet.Attributes;
using System.Threading;

namespace Sample
{
    public class Benchmarks
    {
        [Benchmark]
        public void Sleep() => Thread.Sleep(10);

    }
}
