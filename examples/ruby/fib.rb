# frozen_string_literal: true

def fib(n)
  return 1 if n <= 1

  fib(n - 2) + fib(n - 1)
end
