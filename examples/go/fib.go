package fib

func Fib(u uint) uint {
	if u <= 1 {
		return 1
	}
	return Fib(u-2) + Fib(u-1)
}
