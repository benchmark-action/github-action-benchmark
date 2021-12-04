# Julia example with `BenchmarkTools.jl`

Please read the [docs](https://juliaci.github.io/BenchmarkTools.jl/stable/manual/) of `BenchmarkTools.jl` first. Expecially the [BenchmarkGroup](https://juliaci.github.io/BenchmarkTools.jl/stable/manual/#The-BenchmarkGroup-type) section. Generally speaking, we only need the `json` file exported by `BenchmarkTools.save`. You can checkout the [`fib.jl`](./fib.jl) file for how to do it.  A [workflow](../../.github/workflows/julia.yml) for this example is also provided to help you integrate it in your project.

**Note:** Currently we only support test suite after applying an estimation (`minimumm`,`median`, `mean`, `maximum`, `std`).