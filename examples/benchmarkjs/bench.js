const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();
const { fib } = require('./index');

suite
    .add('fib(10)', () => {
        fib(10);
    })
    .add('fib(20)', () => {
        fib(20);
    })
    .on('cycle', (event) => {
        console.log(String(event.target));
    })
    .run();
