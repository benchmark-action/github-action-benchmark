using BenchmarkTools

fib(n) = n <= 1 ?  1 : fib(n - 2) + fib(n - 1)

suite = BenchmarkGroup()

suite["fib"] = BenchmarkGroup(["tag1", "tag2"])

suite["fib"][10] = @benchmarkable fib(10)
suite["fib"][20] = @benchmarkable fib(20)

tune!(suite)
results = run(suite, verbose = true)

BenchmarkTools.save("output.json", median(results))
