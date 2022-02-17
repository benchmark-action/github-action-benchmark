using BenchmarkDotNet.Running;

namespace Sample
{
    public class Program
    {
        public static void Main(string[] args) => BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
    }
}