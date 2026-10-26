# frozen_string_literal: true

require 'benchmark/ips'
require_relative 'fib'

Benchmark.ips do |x|
  x.report('fib(10)') { fib(10) }
  x.report('fib(20)') { fib(20) }
end
