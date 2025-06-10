require "benchmark"

def fibonacci(n : Int32) : Int32
  return 0 if n < 0
  return n if n <= 1
  fibonacci(n - 1) + fibonacci(n - 2)
end

Benchmark.ips(warmup: 4.seconds, calculation: 10.seconds) do |x|
  x.report("fibonacci(10)") do
    fibonacci(10)
  end

  x.report("fibonacci(20)") do
    fibonacci(20)
  end
end
