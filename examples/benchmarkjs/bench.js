const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();
const { fib } = require('./index');

suite
    .add('fib(10)', () => {
        fib(20);
    })
    .add('fib(20)', () => {
        fib(20);
    })
    .on('cycle', (event) => {
        console.log(String(event.target));
    })
    .run();
