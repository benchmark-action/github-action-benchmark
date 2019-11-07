pub fn fib(u: u32) -> u32 {
    if u <= 1 {
        1
    } else {
        fib(u - 2) + fib(u - 1)
    }
}
