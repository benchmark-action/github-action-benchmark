# frozen_string_literal: true

require 'benchmark/memory'
require_relative 'fib'

Benchmark.memory do |x|
  x.report('fib(10)') { fib(10) }
  x.report('fib(10).to_s * 100') { fib(10).to_s * 100 }
  x.report('Array.new(1000)') { Array.new(1000) }
end
