bench: a.out
	./a.out

json: a.out
	./a.out --benchmark_format=json | tee benchmark_result.json

a.out: benchmark/build/src/libbenchmark.a bench.cpp fib.hpp
	clang++ -std=c++14 -O3 -I ./benchmark/include -L ./benchmark/build/src/ -l benchmark bench.cpp

benchmark/build/src/libbenchmark.a: benchmark/build benchmark/googletest
	cd ./benchmark/build && \
	cmake -DCMAKE_BUILD_TYPE=Release ../ && \
	make -j

benchmark/build: benchmark
	mkdir -p benchmark/build

benchmark:
	git clone --depth=1 --single-branch https://github.com/google/benchmark.git benchmark

benchmark/googletest: benchmark
	git clone --depth=1 --single-branch https://github.com/google/googletest.git benchmark/googletest

clean:
	rm -rf a.out benchmark

.PHONY: bench json clean
