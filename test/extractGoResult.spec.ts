import { extractGoResult } from '../src/extract';
import dedent from 'dedent';

describe('extractGoResult()', () => {
    describe('basic benchmark extraction', () => {
        it('extracts a simple benchmark result', () => {
            const output = `BenchmarkFib10-8    	5000000	       325 ns/op`;

            const results = extractGoResult(output);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                name: 'BenchmarkFib10',
                value: 325,
                unit: 'ns/op',
                extra: '5000000 times\n8 procs',
            });
        });

        it('extracts benchmark without processor count', () => {
            const output = `BenchmarkFib10    	5000000	       325 ns/op`;

            const results = extractGoResult(output);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                name: 'BenchmarkFib10',
                value: 325,
                unit: 'ns/op',
                extra: '5000000 times',
            });
        });

        it('extracts multiple benchmarks', () => {
            const output = dedent`
                BenchmarkFib10-8    	5000000	       325 ns/op
                BenchmarkFib20-8    	  30000	     40537 ns/op
            `;

            const results = extractGoResult(output);

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('BenchmarkFib10');
            expect(results[1].name).toBe('BenchmarkFib20');
        });

        it('handles benchmarks with special characters in name', () => {
            const output = `BenchmarkFib/my/tabled/benchmark_-_20,var1=13,var2=14-8    	5000000	       325 ns/op`;

            const results = extractGoResult(output);

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('BenchmarkFib/my/tabled/benchmark_-_20,var1=13,var2=14');
        });
    });

    describe('multiple metrics per benchmark', () => {
        it('extracts all metrics from a benchmark with multiple values', () => {
            const output = `BenchmarkAlloc-8    	1000000	      1024 ns/op	     512 B/op	       8 allocs/op`;

            const results = extractGoResult(output);

            expect(results).toHaveLength(4);
            // First entry is the combined metrics (backward compatibility)
            expect(results[0].name).toBe('BenchmarkAlloc');
            expect(results[0].unit).toContain('ns/op');
            // Second entry is ns/op metric
            expect(results[1].name).toBe('BenchmarkAlloc - ns/op');
            expect(results[1].value).toBe(1024);
            expect(results[1].unit).toBe('ns/op');
            // Third entry is B/op metric
            expect(results[2].name).toBe('BenchmarkAlloc - B/op');
            expect(results[2].value).toBe(512);
            expect(results[2].unit).toBe('B/op');
            // Fourth entry is allocs/op metric
            expect(results[3].name).toBe('BenchmarkAlloc - allocs/op');
            expect(results[3].value).toBe(8);
            expect(results[3].unit).toBe('allocs/op');
        });
    });

    describe('single package (backward compatibility)', () => {
        it('does not add package suffix when only one package exists', () => {
            const output = dedent`
                goos: darwin
                goarch: arm64
                pkg: github.com/example/mypackage
                BenchmarkFib10
                BenchmarkFib10-8    	5000000	       325 ns/op
                BenchmarkFib20
                BenchmarkFib20-8    	  30000	     40537 ns/op
                PASS
                ok  	github.com/example/mypackage	3.614s
            `;

            const results = extractGoResult(output);

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('BenchmarkFib10');
            expect(results[1].name).toBe('BenchmarkFib20');
        });

        it('does not add package suffix when no pkg lines exist', () => {
            const output = dedent`
                BenchmarkFib10-8    	5000000	       325 ns/op
                BenchmarkFib20-8    	  30000	     40537 ns/op
            `;

            const results = extractGoResult(output);

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('BenchmarkFib10');
            expect(results[1].name).toBe('BenchmarkFib20');
        });
    });

    describe('multiple packages (issue #264)', () => {
        it('adds package suffix when multiple packages have benchmarks', () => {
            const output = dedent`
                goos: darwin
                goarch: arm64
                pkg: github.com/example/package1
                BenchmarkFoo
                BenchmarkFoo-8    	5000000	       100 ns/op
                pkg: github.com/example/package2
                BenchmarkBar
                BenchmarkBar-8    	3000000	       200 ns/op
            `;

            const results = extractGoResult(output);

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('BenchmarkFoo (github.com/example/package1)');
            expect(results[1].name).toBe('BenchmarkBar (github.com/example/package2)');
        });

        it('disambiguates benchmarks with the same name in different packages', () => {
            const output = dedent`
                goos: darwin
                goarch: arm64
                pkg: github.com/gofiber/fiber/v3/middleware/cache
                BenchmarkAppendMsgitem
                BenchmarkAppendMsgitem-12    	63634455	        19.01 ns/op
                pkg: github.com/gofiber/fiber/v3/middleware/csrf
                BenchmarkAppendMsgitem
                BenchmarkAppendMsgitem-12    	1000000000	         0.2926 ns/op
            `;

            const results = extractGoResult(output);

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('BenchmarkAppendMsgitem (github.com/gofiber/fiber/v3/middleware/cache)');
            expect(results[0].value).toBe(19.01);
            expect(results[1].name).toBe('BenchmarkAppendMsgitem (github.com/gofiber/fiber/v3/middleware/csrf)');
            expect(results[1].value).toBe(0.2926);
        });

        it('applies package suffix to all metrics when multiple packages exist', () => {
            const output = dedent`
                pkg: github.com/example/pkg1
                BenchmarkAlloc-8    	1000000	      100 ns/op	     512 B/op	       4 allocs/op
                pkg: github.com/example/pkg2
                BenchmarkAlloc-8    	2000000	      200 ns/op	     256 B/op	       2 allocs/op
            `;

            const results = extractGoResult(output);

            // Each benchmark produces 4 entries (combined + ns/op + B/op + allocs/op)
            expect(results).toHaveLength(8);

            // First package benchmarks
            expect(results[0].name).toBe('BenchmarkAlloc (github.com/example/pkg1)');
            expect(results[1].name).toBe('BenchmarkAlloc (github.com/example/pkg1) - ns/op');
            expect(results[2].name).toBe('BenchmarkAlloc (github.com/example/pkg1) - B/op');
            expect(results[3].name).toBe('BenchmarkAlloc (github.com/example/pkg1) - allocs/op');

            // Second package benchmarks
            expect(results[4].name).toBe('BenchmarkAlloc (github.com/example/pkg2)');
            expect(results[5].name).toBe('BenchmarkAlloc (github.com/example/pkg2) - ns/op');
            expect(results[6].name).toBe('BenchmarkAlloc (github.com/example/pkg2) - B/op');
            expect(results[7].name).toBe('BenchmarkAlloc (github.com/example/pkg2) - allocs/op');
        });
    });

    describe('edge cases', () => {
        it('handles benchmarks before any pkg line in multi-package output', () => {
            const output = dedent`
                BenchmarkOrphan-8    	1000000	       50 ns/op
                pkg: github.com/example/pkg1
                BenchmarkFoo-8    	5000000	       100 ns/op
                pkg: github.com/example/pkg2
                BenchmarkBar-8    	3000000	       200 ns/op
            `;

            const results = extractGoResult(output);

            expect(results).toHaveLength(3);
            // Orphan benchmark has no package context, so no suffix even though multiple packages exist
            expect(results[0].name).toBe('BenchmarkOrphan');
            expect(results[1].name).toBe('BenchmarkFoo (github.com/example/pkg1)');
            expect(results[2].name).toBe('BenchmarkBar (github.com/example/pkg2)');
        });

        it('returns empty array for output with no benchmarks', () => {
            const output = dedent`
                goos: darwin
                goarch: arm64
                PASS
                ok  	github.com/example/mypackage	0.001s
            `;

            const results = extractGoResult(output);

            expect(results).toHaveLength(0);
        });

        it('returns empty array for empty input', () => {
            const results = extractGoResult('');

            expect(results).toHaveLength(0);
        });

        it('handles Windows line endings', () => {
            const output =
                'pkg: github.com/example/pkg1\r\n' +
                'BenchmarkFoo-8    	5000000	       100 ns/op\r\n' +
                'pkg: github.com/example/pkg2\r\n' +
                'BenchmarkBar-8    	3000000	       200 ns/op';

            const results = extractGoResult(output);

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('BenchmarkFoo (github.com/example/pkg1)');
            expect(results[1].name).toBe('BenchmarkBar (github.com/example/pkg2)');
        });

        it('handles multiple benchmarks within the same package', () => {
            const output = dedent`
                pkg: github.com/example/pkg1
                BenchmarkFoo-8    	5000000	       100 ns/op
                BenchmarkBar-8    	3000000	       150 ns/op
                pkg: github.com/example/pkg2
                BenchmarkBaz-8    	2000000	       200 ns/op
            `;

            const results = extractGoResult(output);

            expect(results).toHaveLength(3);
            expect(results[0].name).toBe('BenchmarkFoo (github.com/example/pkg1)');
            expect(results[1].name).toBe('BenchmarkBar (github.com/example/pkg1)');
            expect(results[2].name).toBe('BenchmarkBaz (github.com/example/pkg2)');
        });
    });
});
