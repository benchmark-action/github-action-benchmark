pub fn fib(u: u32) -> u32 {
    if u <= 1 {
        1
    } else {
        fib(u - 2) + fib(u - 1)
    }
}

pub fn fast_fib(n: u32) -> u32 {
    let mut a = 0;
    let mut b = 1;

    match n {
        0 => b,
        _ => {
            for _ in 0..n {
                let c = a + b;
                a = b;
                b = c;
            }
            b
        }
    }
}

