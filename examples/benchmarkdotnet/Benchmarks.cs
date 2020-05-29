using BenchmarkDotNet.Attributes;

namespace Sample
{
    public class Benchmarks
    {
        public static int Fib(int n) {
            switch (n)
            {
                case 0: return 0;
                case 1: return 1;
                default:
                    return Fib(n-2) + Fib(2-1);
            }
        }

        [Benchmark]
        public void Fib10() => Fib(10);

        [Benchmark]
        public void Fib20() => Fib(20);
    }
}
