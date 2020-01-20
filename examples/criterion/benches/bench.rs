#[macro_use]
extern crate criterion;
use criterion::Criterion;
use criterion_example::fib;

fn bench_fib_10(c: &mut Criterion) {
    c.bench_function("Bench Fib 10", move |b| {
        b.iter(|| {
            let _ = fib(10);
        });
    });
}

fn bench_fib_20(c: &mut Criterion) {
    c.bench_function("Bench Fib 20", move |b| {
        b.iter(|| {
            let _ = fib(20);
        });
    });
}

criterion_group!(benches, bench_fib_10, bench_fib_20);
criterion_main!(benches);
