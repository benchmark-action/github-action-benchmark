#[macro_use]
extern crate criterion;
use criterion::{black_box, Criterion, BenchmarkId};
use criterion_example::{fib, fast_fib};

fn bench_fib_10(c: &mut Criterion) {
    c.bench_function("BenchFib10", move |b| {
        b.iter(|| {
            let _ = fib(black_box(10));
        });
    });
}

fn bench_fib_20(c: &mut Criterion) {
    c.bench_function("BenchFib20", move |b| {
        b.iter(|| {
            let _ = fib(20);
        });
    });
}

fn bench_fibs(c: &mut Criterion) {
    let mut group = c.benchmark_group("Fibonacci");
    for i in [20, 21].iter() {
        group.bench_with_input(BenchmarkId::new("Recursive", i), i,
            |b, i| b.iter(|| fib(*i)));
        group.bench_with_input(BenchmarkId::new("Iterative", i), i,
            |b, i| b.iter(|| fast_fib(*i)));
    }
    group.finish();
}


criterion_group!(benches, bench_fib_10, bench_fib_20, bench_fibs);
criterion_main!(benches);
