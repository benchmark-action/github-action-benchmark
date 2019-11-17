from fib import fib
import pytest

def test_fib_10(benchmark):
    benchmark(fib, 10)

def test_fib_20(benchmark):
    benchmark(fib, 20)
